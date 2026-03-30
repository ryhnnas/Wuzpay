import { Hono } from "npm:hono";
import { PendingOrder } from "../models/PendingOrder.ts";

const pendingOrders = new Hono();

// GET ALL PENDING ORDERS
pendingOrders.get("/", async (c) => {
  try {
    const data = await PendingOrder.find().sort({ createdAt: 1 });
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// CREATE PENDING ORDER
pendingOrders.post("/", async (c) => {
  try {
    const body = await c.req.json();
    
    const newOrder = await PendingOrder.create({
      customer_name: body.customer_name,
      items: body.items,
      subtotal: Number(body.subtotal),
      discount_amount: Number(body.discount_amount) || 0,
      discount_name: body.discount_name,
      selected_discount_id: body.selected_discount_id,
      total_amount: Number(body.total_amount)
    });

    return c.json(newOrder);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// EDIT PENDING ORDER
pendingOrders.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const updatedOrder = await PendingOrder.findByIdAndUpdate(
      id,
      {
        customer_name: body.customer_name,
        items: body.items,
        subtotal: Number(body.subtotal),
        discount_amount: Number(body.discount_amount),
        discount_name: body.discount_name,
        selected_discount_id: body.selected_discount_id,
        total_amount: Number(body.total_amount)
      },
      { new: true } // Mengembalikan data yang sudah diupdate
    );

    if (!updatedOrder) return c.json({ error: "Data tidak ditemukan" }, 404);
    
    return c.json(updatedOrder);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// DELETE PENDING ORDER
pendingOrders.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await PendingOrder.findByIdAndDelete(id);

    if (!result) return c.json({ error: "Data tidak ditemukan" }, 404);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

export default pendingOrders;