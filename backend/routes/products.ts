import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";
import { verifyAuth } from "../middleware/auth.ts";
import * as XLSX from "npm:xlsx";

const products = new Hono();

// ==================== GET ALL PRODUCTS ====================
products.get("/", async (c) => {
  try {
    const db = getSupabase();
    const { data: productsData, error } = await db
      .from('products')
      .select(`
        *,
        categories (name) 
      `)
      .order('stock_quantity', { ascending: true }) 
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase Error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ products: productsData || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// ==================== EXPORT TO EXCEL ====================
products.get("/export", async (c) => {
  try {
    const db = getSupabase();
    const { data: productsData, error } = await db
      .from('products')
      .select('id, name, description, sku, price, cost, stock_quantity, category_id, image_url')
      .order('name', { ascending: true });

    if (error) throw error;

    const worksheet = XLSX.utils.json_to_sheet(productsData || []);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new Response(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="data_produk_seblak.xlsx"',
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
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
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
        const { id, name, sku, price, cost, stock_quantity, category_id } = row;
        if (!name) continue;

        let existingProduct = null;
        if (id) {
          const { data } = await db.from('products').select('*').eq('id', id).maybeSingle();
          existingProduct = data;
        } else if (sku) {
          const { data } = await db.from('products').select('*').eq('sku', sku).maybeSingle();
          existingProduct = data;
        }

        const payload = {
          name,
          sku: sku || "",
          price: Number(price) || 0,
          cost: Number(cost) || 0,
          stock_quantity: Number(stock_quantity) || 0,
          category_id: category_id || null,
          updated_at: new Date().toISOString()
        };

        if (existingProduct) {
          await db.from('products').update(payload).eq('id', existingProduct.id);
          results.updated++;
        } else {
          await db.from('products').insert({ ...payload, created_at: new Date().toISOString() });
          results.added++;
        }
      } catch (err: any) {
        results.errors.push({ name: row.name, error: err.message });
      }
    }

    return c.json({ success: true, results });
  } catch (error) {
    return c.json({ error: "Gagal memproses excel" }, 500);
  }
});

// ==================== STOCK MANAGEMENT ====================
products.get("/stock/logs", async (c) => {
  try {
    const db = getSupabase();
    const { data: logs, error } = await db
      .from('stock_logs')
      .select('*, products (name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return c.json({ logs: logs || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch logs' }, 500);
  }
});

products.post("/:id/add-stock", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
    const id = c.req.param("id");
    const { amount } = await c.req.json();

    const { data: product } = await db.from('products').select('stock_quantity').eq('id', id).single();
    if (!product) return c.json({ error: "Produk tidak ditemukan" }, 404);

    const newStock = (product.stock_quantity || 0) + Number(amount);

    await db.from('products').update({ stock_quantity: newStock }).eq('id', id);
    await db.from('stock_logs').insert({
      product_id: id,
      user_id: user.id,
      previous_stock: product.stock_quantity,
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
    const db = getSupabase();
    const { data: product, error } = await db.from('products').select('*').eq('id', c.req.param('id')).single();
    if (error || !product) return c.json({ error: 'Not found' }, 404);
    return c.json({ product });
  } catch (error) {
    return c.json({ error: 'Error' }, 500);
  }
});

products.post("/", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
    const body = await c.req.json();
    const { data, error } = await db.from('products').insert({
      ...body,
      price: Number(body.price),
      cost: Number(body.cost),
      stock_quantity: Number(body.stock_quantity),
      created_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;
    return c.json({ product: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

products.put("/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
    const body = await c.req.json();
    const { data, error } = await db.from('products').update({
      ...body,
      price: Number(body.price),
      cost: Number(body.cost),
      stock_quantity: Number(body.stock_quantity),
      updated_at: new Date().toISOString()
    }).eq('id', c.req.param('id')).select().single();

    if (error) throw error;
    return c.json({ product: data });
  } catch (error) {
    console.log('Update product error:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

// Delete product
products.delete("/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
    await db.from('products').delete().eq('id', c.req.param('id'));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Delete failed' }, 500);
  }
});

export default products;