import { Hono } from "npm:hono";
import { Transaction } from "../models/Transaction.ts";
import { Product, StockLog } from "../models/Product.ts";
import { verifyAuth } from "../middleware/auth.ts";
import mongoose from "npm:mongoose";

const transactions = new Hono();

// ==================== 1. GET ALL TRANSACTIONS ====================
transactions.get("/", async (c) => {
  try {
    const authHeader = c.req.header("Authorization") || null;
    const sessionId = c.req.header("X-Session-ID") || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const filter: any = {};
    if (startDate && endDate) {
      // FIX TANGGAL: Cari dari jam 00:00:00 sampe 23:59:59 mang!
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const data = await Transaction.find(filter).sort({ createdAt: -1 });
    return c.json(data);
  } catch (error) {
    return c.json({ error: "Gagal mengambil data transaksi" }, 500);
  }
});

// ==================== 2. CREATE TRANSACTION ====================
transactions.post("/", async (c) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authHeader = c.req.header("Authorization") || null;
    const sessionId = c.req.header("X-Session-ID") || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const body = await c.req.json();
    const now = new Date();

    const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptNumber = `WUZ-${datePart}-${randomPart}`;

    const subtotal = parseFloat(body.total_real_amount || body.subtotal || 0);
    const discountAmount = parseFloat(body.discount_amount || 0);
    const totalAmount = subtotal - discountAmount;

    let totalGrossProfit = 0;
    const processedItems = [];

    for (const item of body.items) {
      const product = await Product.findById(item.product_id || item.id).session(session);
      if (!product) throw new Error(`Produk ${item.name} tidak ditemukan`);

      const qty = parseInt(item.quantity);
      const priceAtSale = parseFloat(item.price_at_sale || product.price);
      const costAtSale = parseFloat(product.cost_price || product.cost || 0);

      totalGrossProfit += (priceAtSale - costAtSale) * qty;

      product.stock_quantity -= qty;
      await product.save({ session });

      await StockLog.create([{
        product_id: product._id,
        user_id: user.id,
        previous_stock: product.stock_quantity + qty,
        added_stock: -qty,
        current_stock: product.stock_quantity,
        type: 'reduction'
      }], { session });

      processedItems.push({
        product_id: product._id,
        name: product.name,
        quantity: qty,
        price_at_sale: priceAtSale,
        cost_at_sale: costAtSale,
        total_amount: qty * priceAtSale,
        category_name: item.category_name || "Umum"
      });
    }

    const newTransaction = await Transaction.create([{
      userId: user.id,
      total_amount: totalAmount,
      total_real_amount: subtotal,
      discount_amount: discountAmount,
      profit: totalGrossProfit - discountAmount,
      payment_method: body.payment_method || "cash",
      receipt_number: receiptNumber, // Pake receipt_number mang biar sinkron
      items: processedItems,
      status: "completed"
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return c.json({ success: true, transaction: newTransaction[0] });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    return c.json({ error: error.message }, 500);
  }
});

// ==================== 3. UPDATE TRANSACTION ITEMS (INI YANG HILANG MANG!) ====================
transactions.put("/:id/items", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const { items, total_amount, total_real_amount, profit } = body;

    const updated = await Transaction.findByIdAndUpdate(
      id,
      { 
        $set: { 
          items, 
          total_amount, 
          total_real_amount, 
          profit,
          updatedAt: new Date()
        } 
      },
      { new: true }
    );

    if (!updated) return c.json({ error: "Transaksi ga ketemu mang!" }, 404);

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ error: "Gagal update items: " + error.message }, 500);
  }
});

// ==================== 4. GET BY ID ====================
transactions.get("/:id", async (c) => {
  try {
    const data = await Transaction.findById(c.req.param("id"));
    if (!data) return c.json({ error: "Transaksi tidak ditemukan" }, 404);
    return c.json(data);
  } catch (error) {
    return c.json({ error: "ID tidak valid" }, 400);
  }
});

export default transactions;