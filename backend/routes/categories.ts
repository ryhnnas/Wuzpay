import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";
import { verifyAuth } from "../middleware/auth.ts";

const categories = new Hono();

// ==================== GET ALL CATEGORIES ====================
categories.get("/", async (c) => {
  try {
    // Gunakan instance fresh
    const db = getSupabase();
    
    const { data, error } = await db
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return c.json({ categories: data || [] });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// ==================== CREATE CATEGORY ====================
categories.post("/", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const body = await c.req.json();
    
    const { data: category, error: insertError } = await db
      .from('categories')
      .insert({
        name: body.name,
        description: body.description || "",
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return c.json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    return c.json({ error: error.message || 'Failed to create category' }, 500);
  }
});

// ==================== UPDATE CATEGORY ====================
categories.put("/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const id = c.req.param('id');
    const body = await c.req.json();

    const { data: category, error: updateError } = await db
      .from('categories')
      .update({
        name: body.name,
        description: body.description,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return c.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    return c.json({ error: 'Failed to update' }, 500);
  }
});

// ==================== DELETE CATEGORY ====================
categories.delete("/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const id = c.req.param('id');
    
    const { error: deleteError } = await db
      .from('categories')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return c.json({ error: 'Failed to delete' }, 500);
  }
});

export default categories;