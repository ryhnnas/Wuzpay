import { Hono } from "npm:hono";
import { Customer, Supplier, Discount } from "../models/Entity.ts";
import { verifyAuth } from "../middleware/auth.ts";
import mongoose from "npm:mongoose";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";
import { validatePagination } from "../middleware/validator.ts";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional()
});

const validateCustomer = zValidator('json', customerSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional()
});

const validateSupplier = zValidator('json', supplierSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const discountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.union([z.string(), z.number()]).transform(v => Number(v)),
  value_type: z.enum(['percentage', 'fixed']),
  scope: z.enum(['product', 'category', 'transaction']),
  is_active: z.boolean().optional(),
  product_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  category_id: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable()
});

const validateDiscount = zValidator('json', discountSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const typeAndIdSchema = z.object({
  type: z.enum(['customers', 'suppliers', 'discounts']),
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format")
});

const validateTypeAndId = zValidator('param', typeAndIdSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});


const entities = new Hono();

// ==================== CUSTOMERS ====================
entities.get("/customers", validatePagination, async (c) => {
  try {
    const { page, limit } = c.req.valid('query');
    const skip = (page - 1) * limit;

    const total = await Customer.countDocuments();
    const customers = await Customer.find()
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return c.json({
      customers: customers || [],
      meta: {
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        limit
      }
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch customers' }, 500);
  }
});

entities.post("/customers", validateCustomer, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const body = c.req.valid('json');
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

entities.post("/suppliers", validateSupplier, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const body = c.req.valid('json');
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

entities.post("/discounts", validateDiscount, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const body = c.req.valid('json');

    // Siapkan data bersih
    const discountData: any = {
      name: body.name,
      value: body.value,
      value_type: body.value_type,
      scope: body.scope,
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
entities.delete("/:type/:id", validateTypeAndId, async (c) => {
  try {
    const { type, id } = c.req.valid('param');
    if (type === 'customers') await Customer.findByIdAndDelete(id);
    else if (type === 'suppliers') await Supplier.findByIdAndDelete(id);
    else if (type === 'discounts') await Discount.findByIdAndDelete(id);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Delete failed' }, 500);
  }
});

export default entities;