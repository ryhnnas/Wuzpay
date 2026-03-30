// backend/routes/pending_orders.ts
import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";

const pendingOrders = new Hono();

// GET ALL PENDING ORDERS
pendingOrders.get("/", async (c) => {
  const db = getSupabase();
  const { data, error } = await db
    .from("pending_orders")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data);
});

// CREATE PENDING ORDER
pendingOrders.post("/", async (c) => {
  const db = getSupabase();
  const body = await c.req.json();
  
  const { data, error } = await db
    .from("pending_orders")
    .insert([{
      customer_name: body.customer_name,
      items: body.items,
      subtotal: body.subtotal,
      discount_amount: body.discount_amount,
      discount_name: body.discount_name,
      selected_discount_id: body.selected_discount_id,
      total_amount: body.total_amount
    }])
    .select();

  if (error) return c.json({ error: error.message }, 400);
  return c.json(data[0]);
});
// EDIT PENDING ORDER
pendingOrders.put("/:id", async (c) => {
  const db = getSupabase();
  const id = c.req.param("id"); // Mengambil ID dari URL
  const body = await c.req.json();
  
  const { data, error } = await db
    .from("pending_orders")
    .update({
      customer_name: body.customer_name,
      items: body.items,
      subtotal: body.subtotal,
      discount_amount: body.discount_amount,
      discount_name: body.discount_name,
      selected_discount_id: body.selected_discount_id,
      total_amount: body.total_amount,
      // created_at tidak perlu diupdate biar jam masuknya tetap sama
    })
    .eq("id", id) // Mencocokkan ID
    .select();

  if (error) return c.json({ error: error.message }, 400);
  
  if (data.length === 0) return c.json({ error: "Data tidak ditemukan" }, 404);
  
  return c.json(data[0]);
});

// DELETE PENDING ORDER
pendingOrders.delete("/:id", async (c) => {
  const db = getSupabase();
  const id = c.req.param("id");
  
  const { error } = await db
    .from("pending_orders")
    .delete()
    .eq("id", id);

  if (error) return c.json({ error: error.message }, 400);
  return c.json({ success: true });
});

export default pendingOrders;