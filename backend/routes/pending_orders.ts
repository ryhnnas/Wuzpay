import { Hono } from "npm:hono";
import { PendingOrder } from "../models/PendingOrder.ts";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";
import { validateId } from "../middleware/validator.ts";

const pendingOrderSchema = z.object({
  customer_name: z.string().optional(),
  items: z.array(z.any()),
  subtotal: z.union([z.string(), z.number()]).transform(v => Number(v)),
  discount_amount: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
  discount_name: z.string().optional(),
  selected_discount_id: z.string().optional().nullable(),
  total_amount: z.union([z.string(), z.number()]).transform(v => Number(v))
});

const validatePendingOrder = zValidator('json', pendingOrderSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});


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
pendingOrders.post("/", validatePendingOrder, async (c) => {
  try {
    const body = c.req.valid('json');
    
    const newOrder = await PendingOrder.create({
      customer_name: body.customer_name,
      items: body.items,
      subtotal: body.subtotal,
      discount_amount: body.discount_amount || 0,
      discount_name: body.discount_name,
      selected_discount_id: body.selected_discount_id,
      total_amount: body.total_amount
    });

    return c.json(newOrder);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// EDIT PENDING ORDER
pendingOrders.put("/:id", validateId, validatePendingOrder, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    
    const updatedOrder = await PendingOrder.findByIdAndUpdate(
      id,
      {
        customer_name: body.customer_name,
        items: body.items,
        subtotal: body.subtotal,
        discount_amount: body.discount_amount,
        discount_name: body.discount_name,
        selected_discount_id: body.selected_discount_id,
        total_amount: body.total_amount
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
pendingOrders.delete("/:id", validateId, async (c) => {
  try {
    const { id } = c.req.valid('param');
    const result = await PendingOrder.findByIdAndDelete(id);

    if (!result) return c.json({ error: "Data tidak ditemukan" }, 404);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

export default pendingOrders;