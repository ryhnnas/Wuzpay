import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";
import { verifyAuth } from "../middleware/auth.ts";

const entities = new Hono();

// ==================== CUSTOMERS ====================

// Get all customers
entities.get("/customers", async (c) => {
  try {
    const db = getSupabase();
    const { data: customers, error } = await db.from('customers').select('*');
    if (error) throw error;
    return c.json({ customers: customers || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch customers' }, 500);
  }
});

// Create customer
entities.post("/customers", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const body = await c.req.json();
    
    const { data: customer, error: insertError } = await db
      .from('customers')
      .insert({
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return c.json({ customer });
  } catch (error) {
    return c.json({ error: error.message || 'Failed to create customer' }, 500);
  }
});

// Update customer
entities.put("/customers/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const { data: customer, error: updateError } = await db
      .from('customers')
      .update({
        name: updates.name,
        phone: updates.phone,
        email: updates.email,
        address: updates.address,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return c.json({ customer });
  } catch (error) {
    console.error('Update customer error:', error);
    return c.json({ error: 'Failed to update customer' }, 500);
  }
});

// Delete customer
entities.delete("/customers/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const id = c.req.param('id');
    const { error: deleteError } = await db.from('customers').delete().eq('id', id);

    if (deleteError) throw deleteError;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete customer' }, 500);
  }
});

// ==================== SUPPLIERS ====================

// Get all suppliers
entities.get("/suppliers", async (c) => {
  try {
    const db = getSupabase();
    const { data: suppliers, error } = await db.from('suppliers').select('*');
    if (error) throw error;
    return c.json({ suppliers: suppliers || [] });
  } catch (error) {
    return c.json({ error: 'Failed to fetch suppliers' }, 500);
  }
});

// Create supplier
entities.post("/suppliers", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const body = await c.req.json();
    
    const { data: supplier, error: insertError } = await db
      .from('suppliers')
      .insert({
        name: body.name,
        email: body.email,           
        phone: body.phone,           
        office_address: body.office_address, 
        contact_info: body.phone || body.contact_info || "", 
        created_at: new Date().toISOString()
        })
      .select()
      .single();

    if (insertError) throw insertError;
    return c.json({ supplier });
  } catch (error) {
    return c.json({ error: error.message || 'Failed to create supplier' }, 500);
  }
});

// Delete supplier
entities.delete("/suppliers/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const id = c.req.param('id');
    
    // Pastikan tabelnya bener 'suppliers'
    const { error: deleteError } = await db.from('suppliers').delete().eq('id', id);

    if (deleteError) throw deleteError;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete supplier' }, 500);
  }
});

// Update supplier
entities.put("/suppliers/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const id = c.req.param('id');
    const updates = await c.req.json();
    
    const { data: supplier, error: updateError } = await db
      .from('suppliers')
      .update({
        name: updates.name,
        email: updates.email,           
        phone: updates.phone,           
        office_address: updates.office_address,
        contact_info: updates.contact_info || updates.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return c.json({ supplier });
  } catch (error) {
    return c.json({ error: 'Failed to update supplier' }, 500);
  }
});

// ==================== DISCOUNTS (Logika Kompleks) ====================

// Get all discounts
entities.get("/discounts", async (c) => {
  try {
    const db = getSupabase();
    const { data: discounts, error } = await db
      .from('discounts')
      .select(`
        *,
        discount_products (product_id),
        discount_categories (category_id)
      `);

    if (error) throw error;

    const formattedDiscounts = discounts.map(d => ({
      ...d,
      product_id: d.discount_products?.[0]?.product_id || null,
      category_id: d.discount_categories?.[0]?.category_id || null
    }));

    return c.json({ discounts: formattedDiscounts });
  } catch (error) {
    return c.json({ error: 'Failed to fetch discounts' }, 500);
  }
});

// Create discount
entities.post("/discounts", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const body = await c.req.json();
    
    const { data: newDiscount, error: insertError } = await db
      .from('discounts')
      .insert({
        name: body.name,
        description: body.description || "",
        value_type: body.value_type,
        value: body.value,
        scope: body.scope,
        is_active: body.is_active ?? true,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Handle Relasi berdasarkan Scope
    if (body.scope === 'product' && body.product_id) {
      await db.from('discount_products').insert({ 
        discount_id: newDiscount.id, 
        product_id: body.product_id 
      });
    } else if (body.scope === 'category' && body.category_id) {
      await db.from('discount_categories').insert({ 
        discount_id: newDiscount.id, 
        category_id: body.category_id 
      });
    }

    return c.json({ discount: newDiscount });
  } catch (error: any) {
    return c.json({ error: error.message || 'Failed to create discount' }, 500);
  }
});

// Update discount
entities.put("/discounts/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const { data: discount, error: updateError } = await db
      .from('discounts')
      .update({
        name: body.name,
        description: body.description,
        value_type: body.value_type,
        value: body.value,
        scope: body.scope,
        is_active: body.is_active,
        start_date: body.start_date,
        end_date: body.end_date,
      })
      .eq('id', id)
      .select().single();

    if (updateError) throw updateError;

    // Bersihkan relasi lama dan masukkan yang baru
    await Promise.all([
      db.from('discount_products').delete().eq('discount_id', id),
      db.from('discount_categories').delete().eq('discount_id', id)
    ]);

    if ((body.scope === 'product' || body.scope === 'item') && body.product_id) {
      await db.from('discount_products').insert({ discount_id: id, product_id: body.product_id });
    } else if (body.scope === 'category' && body.category_id) {
      await db.from('discount_categories').insert({ discount_id: id, category_id: body.category_id });
    }
    
    return c.json({ discount });
  } catch (error) {
    return c.json({ error: 'Failed to update discount' }, 500);
  }
});

// Delete discount
entities.delete("/discounts/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const id = c.req.param('id');
    const { error: deleteError } = await db.from('discounts').delete().eq('id', id);

    if (deleteError) throw deleteError;
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete discount' }, 500);
  }
});

export default entities;