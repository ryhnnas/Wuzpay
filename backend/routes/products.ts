import { Hono } from "npm:hono";
import { Product, StockLog } from "../models/Product.ts";
import { Category } from "../models/Category.ts";
import { verifyAuth } from "../middleware/auth.ts";
import * as XLSX from "npm:xlsx";
import mongoose from "npm:mongoose";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";
import { validateId, validatePagination } from "../middleware/validator.ts";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  price: z.union([z.string(), z.number()]).transform(v => Number(v)),
  cost_price: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
  category_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  image_url: z.string().optional().nullable(),
  recipe: z.array(z.any()).optional()
});

const validateProduct = zValidator('json', productSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const bulkAddStockSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().optional(),
    product_name: z.string().optional(),
    amount: z.union([z.string(), z.number()]),
    price: z.union([z.string(), z.number()]).optional(),
    cost: z.union([z.string(), z.number()]).optional(),
    is_new: z.boolean().optional()
  })).min(1, "Items array wajib diisi")
});

const validateBulkAddStock = zValidator('json', bulkAddStockSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const addStockSchema = z.object({
  amount: z.union([z.string(), z.number()])
});

const validateAddStock = zValidator('json', addStockSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const products = new Hono();

// ==================== GET ALL PRODUCTS ====================
products.get("/", async (c) => {
  try {
    const pageStr = c.req.query("page");
    const limitStr = c.req.query("limit");
    const hasPage = pageStr !== undefined;
    const hasLimit = limitStr !== undefined;
    const includeRecipe = c.req.query("include_recipe") === "true";

    const total = await Product.countDocuments();
    let query = Product.find()
      .populate('category_id', 'name')
      .sort({ name: 1 });

    if (hasPage || hasLimit) {
      const page = parseInt(pageStr || "1") || 1;
      const limit = parseInt(limitStr || "50") || 50;
      const skip = (page - 1) * limit;
      query = query.skip(skip).limit(limit);
    }

    if (!includeRecipe) {
      query.select("-recipe");
    } else {
      query.populate("recipe.ingredient_id", "name stock_quantity unit");
    }

    const productsData = await query.lean();

    const finalPage = hasPage ? (parseInt(pageStr || "1") || 1) : 1;
    const finalLimit = hasLimit ? (parseInt(limitStr || "50") || 50) : total;

    return c.json({ 
      products: productsData || [],
      meta: {
        total,
        current_page: finalPage,
        total_pages: hasLimit ? Math.ceil(total / finalLimit) : 1,
        limit: finalLimit
      }
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// ==================== EXPORT TO EXCEL ====================
products.get("/export", async (c) => {
  try {
    const categoryId = c.req.query("category_id");
    const search = c.req.query("search");

    const query: any = {};
    if (categoryId && categoryId !== "all" && categoryId !== "undefined" && categoryId !== "null") {
      query.category_id = categoryId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } }
      ];
    }

    let filterCategoryName = "Semua Kategori";
    if (categoryId && categoryId !== "all" && categoryId !== "undefined" && categoryId !== "null") {
      const cat = await Category.findById(categoryId);
      if (cat) {
        filterCategoryName = cat.name;
      }
    }

    const productsData = await Product.find(query).populate('category_id', 'name').sort({ name: 1 }).lean();

    const dateStr = new Date().toLocaleDateString("id-ID", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const aoaData = [
      ["LAPORAN DATA PRODUK WUZPAY"],
      [`Tanggal Ekspor: ${dateStr}`],
      [`Kategori: ${filterCategoryName} | Pencarian: ${search || "Semua"}`],
      [], // Jarak baris kosong
      ["No", "SKU", "Nama Produk", "Kategori", "Harga Beli (HPP)", "Harga Jual", "Stok Sisa", "Deskripsi"]
    ];

    productsData.forEach((p: any, index: number) => {
      aoaData.push([
        index + 1,
        p.sku || "-",
        p.name || "",
        p.category_id?.name || "Umum",
        p.cost_price || p.cost || 0,
        p.price || 0,
        p.stock_quantity || 0,
        p.description || "-"
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

    // Set layout dan format tampilan
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }
    ];

    worksheet['!cols'] = [
      { wch: 6 },   // No
      { wch: 12 },  // SKU
      { wch: 30 },  // Nama Produk
      { wch: 18 },  // Kategori
      { wch: 18 },  // Harga Beli (HPP)
      { wch: 18 },  // Harga Jual
      { wch: 12 },  // Stok Sisa
      { wch: 35 }   // Deskripsi
    ];

    const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:H1");
    for (let r = 5; r <= range.e.r; r++) { // Data dimulai dari baris indeks 5 (row 6)
      // Harga Beli (HPP) - Kolom E (indeks 4)
      const cellCost = worksheet[XLSX.utils.encode_cell({ r, c: 4 })];
      if (cellCost) {
        cellCost.t = 'n';
        cellCost.z = '"Rp"#,##0';
      }

      // Harga Jual - Kolom F (indeks 5)
      const cellPrice = worksheet[XLSX.utils.encode_cell({ r, c: 5 })];
      if (cellPrice) {
        cellPrice.t = 'n';
        cellPrice.z = '"Rp"#,##0';
      }

      // Stok Sisa - Kolom G (indeks 6)
      const cellStock = worksheet[XLSX.utils.encode_cell({ r, c: 6 })];
      if (cellStock) {
        cellStock.t = 'n';
        cellStock.z = '#,##0';
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Katalog Produk");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new Response(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="data_produk_wuzpay.xlsx"',
      },
    });
  } catch (error) {
    console.error("Export error:", error);
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
        const name = row["Nama Produk"] || row["Nama"] || row["name"] || row["Name"];
        if (!name) continue;

        const sku = String(row["SKU"] || row["sku"] || "").trim();
        const price = Number(row["Harga Jual"] || row["Harga"] || row["price"] || row["Price"]) || 0;
        const cost_price = Number(row["Harga Beli (HPP)"] || row["Harga Beli"] || row["cost"] || row["cost_price"] || row["Cost Price"] || row["Cost"]) || 0;
        const stock_quantity = Number(row["Stok Sisa"] || row["Stok"] || row["stock"] || row["stock_quantity"] || row["Stock Quantity"] || row["Stock"]) || 0;
        const categoryName = row["Kategori"] || row["category"] || row["Category"];
        const categoryId = row["category_id"] || row["Category ID"];
        const description = row["Deskripsi"] || row["description"] || row["Description"] || "";

        let resolvedCategoryId = null;
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
          resolvedCategoryId = categoryId;
        } else if (categoryName) {
          const trimmedCatName = String(categoryName).trim();
          let category = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedCatName}$`, "i") } });
          if (!category) {
            category = await Category.create({ name: trimmedCatName });
          }
          resolvedCategoryId = category._id;
        }

        const filter = sku ? { sku } : { name };
        const payload: any = {
          name,
          price,
          cost_price,
          stock_quantity,
          category_id: resolvedCategoryId,
          description,
          userId: user?.id
        };
        if (sku) {
          payload.sku = sku;
        }

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
        results.errors.push({ name: row["Nama Produk"] || row.name || "Unknown", error: err.message });
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
products.post("/bulk-add-stock", validateBulkAddStock, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const { items } = c.req.valid('json');

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

products.post("/:id/add-stock", validateId, validateAddStock, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const { id } = c.req.valid('param');
    const { amount } = c.req.valid('json');

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
products.get("/:id", validateId, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const product = await Product.findById(id).populate('category_id');
    if (!product) return c.json({ error: 'Not found' }, 404);
    return c.json({ product });
  } catch (error) {
    return c.json({ error: 'Format ID salah' }, 400);
  }
});

products.post("/", validateProduct, async (c) => {
  try {
    const body = c.req.valid('json');
    const product = await Product.create({
      ...body
    });

    return c.json({ product });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

products.put("/:id", validateId, validateProduct, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    const product = await Product.findByIdAndUpdate(
      id,
      {
        ...body
      },
      { new: true }
    );

    if (!product) return c.json({ error: "Produk tidak ditemukan" }, 404);
    return c.json({ product });
  } catch (error) {
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

products.delete("/:id", validateId, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const product = await Product.findByIdAndDelete(id);
    if (!product) return c.json({ error: "Produk tidak ditemukan" }, 404);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Delete failed' }, 500);
  }
});

export default products;