import { Hono } from "npm:hono";
import { Product, StockLog } from "../models/Product.ts";
import { verifyAuth } from "../middleware/auth.ts";
import * as XLSX from "npm:xlsx";
import mongoose from "npm:mongoose";

const products = new Hono();

// ==================== GET ALL PRODUCTS ====================
products.get("/", async (c) => {
  try {
    // .populate menggantikan JOIN di SQL
    const productsData = await Product.find()
      .populate('category_id', 'name')
      .populate('recipe.ingredient_id', 'name stock_quantity unit cost_per_unit')
      .sort({ name: 1 });

    return c.json({ products: productsData || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// ==================== EXPORT TO EXCEL ====================
products.get("/export", async (c) => {
  try {
    const productsData = await Product.find().lean();

    const worksheet = XLSX.utils.json_to_sheet(productsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new Response(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="data_produk_wuzpay.xlsx"',
      },
    });
  } catch (error) {
    return c.json({ error: "Gagal mengekspor data" }, 500);
  }
});

// ==================== IMPORT / UPSERT FROM EXCEL ====================
products.post("/import", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "File tidak ditemukan" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheetData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const results = { added: 0, updated: 0, skipped: 0, errors: [] as any[] };

    for (const row of sheetData) {
      try {
        const { name, sku, price, cost, stock_quantity, category_id } = row;
        if (!name) continue;

        // Logika Upsert: Cari berdasarkan SKU (karena ID MongoDB beda format dengan SQL lama)
        const filter = sku ? { sku } : { name };
        const payload = {
          name,
          sku: sku || "",
          price: Number(price) || 0,
          cost: Number(cost) || 0,
          stock_quantity: Number(stock_quantity) || 0,
          category_id: mongoose.Types.ObjectId.isValid(category_id) ? category_id : null,
          userId: user?.id
        };

        const updatedProduct = await Product.findOneAndUpdate(
          filter,
          payload,
          { upsert: true, new: true, rawResult: true }
        );

        if (updatedProduct.lastErrorObject?.updatedExisting) {
          results.updated++;
        } else {
          results.added++;
        }
      } catch (err: any) {
        results.errors.push({ name: row.name, error: err.message });
      }
    }

    return c.json({ success: true, results });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Gagal memproses excel" }, 500);
  }
});

// ==================== STOCK MANAGEMENT ====================
products.get("/stock/logs", async (c) => {
  try {
    const logs = await StockLog.find()
      .populate('product_id', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    return c.json({ logs: logs || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch logs' }, 500);
  }
});

// ==================== BULK ADD STOCK (FROM RECEIPT SCAN) ====================
products.post("/bulk-add-stock", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const { items } = await c.req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Items array wajib diisi' }, 400);
    }

    const results = { updated: 0, created: 0, errors: [] as any[] };

    for (const item of items) {
      try {
        const { product_id, product_name, amount, price, cost, is_new } = item;

        if (is_new && product_name) {
          // Buat produk baru
          const newProduct = await Product.create({
            name: product_name,
            price: Number(price) || 0,
            cost: Number(cost) || 0,
            stock_quantity: Number(amount) || 0,
            userId: user?.id,
          });

          await StockLog.create({
            product_id: newProduct._id,
            user_id: user?.id || 'system',
            previous_stock: 0,
            added_stock: Number(amount),
            current_stock: Number(amount),
            type: 'initial',
          });

          results.created++;
        } else if (product_id) {
          // Update stok produk yang sudah ada
          const product = await Product.findById(product_id);
          if (!product) {
            results.errors.push({ product_id, error: 'Produk tidak ditemukan' });
            continue;
          }

          const previousStock = product.stock_quantity || 0;
          const addedAmount = Number(amount) || 0;
          const newStock = previousStock + addedAmount;

          product.stock_quantity = newStock;
          await product.save();

          await StockLog.create({
            product_id: product._id,
            user_id: user?.id || 'system',
            previous_stock: previousStock,
            added_stock: addedAmount,
            current_stock: newStock,
            type: 'addition',
          });

          results.updated++;
        }
      } catch (err: any) {
        results.errors.push({ item, error: err.message });
      }
    }

    return c.json({ success: true, results });
  } catch (error) {
    console.error('Bulk add stock error:', error);
    return c.json({ error: 'Gagal batch update stok' }, 500);
  }
});

products.post("/:id/add-stock", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const id = c.req.param("id");
    const { amount } = await c.req.json();

    const product = await Product.findById(id);
    if (!product) return c.json({ error: "Produk tidak ditemukan" }, 404);

    const previousStock = product.stock_quantity || 0;
    const newStock = previousStock + Number(amount);

    product.stock_quantity = newStock;
    await product.save();

    await StockLog.create({
      product_id: id,
      user_id: user?.id || "system",
      previous_stock: previousStock,
      added_stock: Number(amount),
      current_stock: newStock,
      type: 'addition'
    });

    return c.json({ success: true, newStock });
  } catch (error) {
    return c.json({ error: "Gagal update stok" }, 500);
  }
});

// ==================== CRUD BASIC ====================
products.get("/:id", async (c) => {
  try {
    const product = await Product.findById(c.req.param('id')).populate('category_id');
    if (!product) return c.json({ error: 'Not found' }, 404);
    return c.json({ product });
  } catch (error) {
    return c.json({ error: 'Format ID salah' }, 400);
  }
});

products.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const product = await Product.create({
      ...body,
      price: Number(body.price),
      cost: Number(body.cost),
      stock_quantity: Number(body.stock_quantity)
    });

    return c.json({ product });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

products.put("/:id", async (c) => {
  try {
    const body = await c.req.json();
    const product = await Product.findByIdAndUpdate(
      c.req.param('id'),
      {
        ...body,
        price: Number(body.price),
        cost: Number(body.cost),
        stock_quantity: Number(body.stock_quantity)
      },
      { new: true }
    );

    if (!product) return c.json({ error: "Produk tidak ditemukan" }, 404);
    return c.json({ product });
  } catch (error) {
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

products.delete("/:id", async (c) => {
  try {
    const product = await Product.findByIdAndDelete(c.req.param('id'));
    if (!product) return c.json({ error: "Produk tidak ditemukan" }, 404);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Delete failed' }, 500);
  }
});

export default products;