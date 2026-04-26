import { Hono } from "npm:hono";
import { Category } from "../models/Category.ts"; // Import Model MongoDB
import { verifyAuth } from "../middleware/auth.ts";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";
import { validateId } from "../middleware/validator.ts";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional()
});

const validateCategory = zValidator('json', categorySchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const categories = new Hono();

// ==================== GET ALL CATEGORIES ====================
categories.get("/", async (c) => {
  try {
    // find() tanpa filter untuk ambil semua, sort by name ascending (1)
    const data = await Category.find().sort({ name: 1 });

    return c.json({ categories: data || [] });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// ==================== CREATE CATEGORY ====================
categories.post("/", validateCategory, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const body = c.req.valid('json');
    
    // Mongoose handle create_at otomatis lewat timestamps: true
    const category = await Category.create({
      name: body.name,
      description: body.description || "",
    });

    return c.json({ category });
  } catch (error: any) {
    console.error('Create category error:', error);
    // Cek jika error karena nama kategori sudah ada (Unique Constraint)
    if (error.code === 11000) {
        return c.json({ error: 'Nama kategori sudah ada!' }, 400);
    }
    return c.json({ error: error.message || 'Failed to create category' }, 500);
  }
});

// ==================== UPDATE CATEGORY ====================
categories.put("/:id", validateId, validateCategory, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    // findByIdAndUpdate dengan opsi { new: true } agar mengembalikan data terbaru
    const category = await Category.findByIdAndUpdate(
      id,
      {
        name: body.name,
        description: body.description,
      },
      { new: true }
    );

    if (!category) return c.json({ error: 'Category not found' }, 404);

    return c.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    return c.json({ error: 'Failed to update' }, 500);
  }
});

// ==================== DELETE CATEGORY ====================
categories.delete("/:id", validateId, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const { id } = c.req.valid('param');
    
    const result = await Category.findByIdAndDelete(id);

    if (!result) return c.json({ error: 'Category not found' }, 404);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return c.json({ error: 'Failed to delete' }, 500);
  }
});

export default categories;