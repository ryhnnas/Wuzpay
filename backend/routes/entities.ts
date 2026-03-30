import { Hono } from "npm:hono";
import { Customer, Supplier, Discount } from "../models/Entity.ts";
import { verifyAuth } from "../middleware/auth.ts";

const entities = new Hono();

// ==================== CUSTOMERS ====================
entities.get("/customers", async (c) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    return c.json({ customers: customers || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch customers' }, 500);
  }
});

entities.post("/customers", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const body = await c.req.json();
    const customer = await Customer.create(body);
    return c.json({ customer });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to create customer' }, 500);
  }
});

// ==================== SUPPLIERS ====================
entities.get("/suppliers", async (c) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    return c.json({ suppliers: suppliers || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch suppliers' }, 500);
  }
});

entities.post("/suppliers", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const body = await c.req.json();
    const supplier = await Supplier.create(body);
    return c.json({ supplier });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to create supplier' }, 500);
  }
});

// ==================== DISCOUNTS (Simple Version) ====================
entities.get("/discounts", async (c) => {
  try {
    // Populate agar kita tahu nama produk/kategori yang dapet diskon
    const discounts = await Discount.find()
      .populate('product_id', 'name')
      .populate('category_id', 'name');
    return c.json({ discounts });
  } catch (error) {
    return c.json({ error: 'Failed to fetch discounts' }, 500);
  }
});

entities.post("/discounts", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const body = await c.req.json();
    
    // Siapkan data bersih
    const discountData: any = {
      name: body.name,
      value: Number(body.value),
      value_type: body.value_type, // 'percentage' atau 'fixed'
      scope: body.scope, // 'product', 'category', atau 'transaction'
      is_active: body.is_active ?? true
    };

    // Validasi ObjectId: Cuma isi kalau formatnya bener, kalau gak bener mending jangan dikirim
    if (body.scope === 'product' && mongoose.Types.ObjectId.isValid(body.product_id)) {
      discountData.product_id = body.product_id;
    }
    
    if (body.scope === 'category' && mongoose.Types.ObjectId.isValid(body.category_id)) {
      discountData.category_id = body.category_id;
    }

    const newDiscount = await Discount.create(discountData);

    return c.json({ success: true, discount: newDiscount });
  } catch (error: any) {
    console.error("EROR SIMPAN DISKON:", error.message); // Biar keliatan di terminal backend
    return c.json({ error: error.message || 'Gagal membuat diskon' }, 500);
  }
});

// DELETE Generic (Bisa dipakai buat customer/supplier/discount)
entities.delete("/:type/:id", async (c) => {
    try {
      const { type, id } = c.req.param();
      if (type === 'customers') await Customer.findByIdAndDelete(id);
      else if (type === 'suppliers') await Supplier.findByIdAndDelete(id);
      else if (type === 'discounts') await Discount.findByIdAndDelete(id);
      
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: 'Delete failed' }, 500);
    }
});

export default entities;