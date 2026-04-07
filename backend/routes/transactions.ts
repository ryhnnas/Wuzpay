import { Hono } from "npm:hono";
import { Transaction } from "../models/Transaction.ts";
import { Product, StockLog } from "../models/Product.ts";
import { Ingredient } from "../models/Ingredient.ts";
import { verifyAuth } from "../middleware/auth.ts";
import { parseDateRange } from "../lib/date.ts";
import mongoose from "npm:mongoose";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";
import { auditLog } from "../lib/logger.ts";

const transactions = new Hono();

// ==================== ZOD SCHEMAS ====================
const transactionItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().optional(),
  name: z.string(),
  quantity: z.union([z.string(), z.number()]),
  price_at_sale: z.union([z.string(), z.number()]).optional(),
  category_name: z.string().optional()
});

const transactionSchema = z.object({
  total_real_amount: z.union([z.string(), z.number()]).optional(),
  subtotal: z.union([z.string(), z.number()]).optional(),
  discount_amount: z.union([z.string(), z.number()]).optional(),
  payment_method: z.string().optional(),
  items: z.array(transactionItemSchema).min(1, "Transaksi minimal harus memiliki 1 item barang.")
});

const updateTransactionSchema = z.object({
  total_amount: z.union([z.string(), z.number()]),
  total_real_amount: z.union([z.string(), z.number()]).optional(),
  profit: z.union([z.string(), z.number()]).optional(),
  items: z.array(transactionItemSchema) // Minimal nggak membatasi karena boleh kosong kalo order di-void?
});

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
      const { start, end } = parseDateRange(startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const data = await Transaction.find(filter).sort({ createdAt: -1 });
    return c.json(data);
  } catch (error) {
    return c.json({ error: "Gagal mengambil data transaksi" }, 500);
  }
});

// ==================== 2. CREATE TRANSACTION (BOM LOGIC) ====================
transactions.post("/", zValidator('json', transactionSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authHeader = c.req.header("Authorization") || null;
    const sessionId = c.req.header("X-Session-ID") || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const body = await c.req.valid('json');
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
      // Fetch produk beserta resepnya
      const product = await Product.findById(item.product_id || item.id).session(session);
      if (!product) throw new Error(`Produk ${item.name} tidak ditemukan`);

      const qty = parseInt(item.quantity);
      const priceAtSale = parseFloat(item.price_at_sale || product.price);
      let calculatedCost = 0; // Akan dihitung dari total harga bahan baku

      // --- LOGIKA BILL OF MATERIALS (BOM) ---
      if (product.recipe && product.recipe.length > 0) {
        for (const recipeItem of product.recipe) {
          const ingredient = await Ingredient.findById(recipeItem.ingredient_id).session(session);

          if (!ingredient) {
            console.warn(`Peringatan: Bahan baku tidak ditemukan untuk produk ${product.name}`);
            continue;
          }

          // Hitung total bahan yang terpakai (Kebutuhan per porsi * Jumlah pesanan)
          const amountToDeduct = recipeItem.amount_needed * qty;

          // Hitung modal secara dinamis (Harga bahan per unit * jumlah yang dipakai)
          calculatedCost += ((ingredient.cost_per_unit || 0) * recipeItem.amount_needed);

          const previousStock = ingredient.stock_quantity || 0;

          // Kurangi stok bahan baku utama
          ingredient.stock_quantity = previousStock - amountToDeduct;
          await ingredient.save({ session });

          // Catat riwayat log dengan sumber "sales_deduction"
          await StockLog.create([{
            ingredient_id: ingredient._id,
            user_id: user.id,
            previous_stock: previousStock,
            added_stock: -amountToDeduct,
            current_stock: ingredient.stock_quantity,
            type: 'reduction',
            source: 'sales_deduction'
          }], { session });
        }
      } else {
        // Fallback: Jika produk belum punya resep, gunakan cost lama atau 0 agar sistem kasir tidak error
        calculatedCost = parseFloat(product.cost_price || product.cost || 0);
      }
      // --------------------------------------

      totalGrossProfit += (priceAtSale - calculatedCost) * qty;

      processedItems.push({
        product_id: product._id,
        name: product.name,
        quantity: qty,
        price_at_sale: priceAtSale,
        cost_at_sale: calculatedCost, // Menyimpan modal real-time dari bahan baku
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
      receipt_number: receiptNumber,
      items: processedItems,
      status: "completed"
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Rekam Log Audit secara asinkron
    auditLog("CREATE_TRANSACTION", user, { receiptNumber, totalAmount, totalItems: processedItems.length });

    return c.json({ success: true, transaction: newTransaction[0] });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    return c.json({ error: error.message }, 500);
  }
});

// ==================== 3. UPDATE TRANSACTION ITEMS ====================
transactions.put("/:id/items", zValidator('json', updateTransactionSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  const id = c.req.param("id");
  try {
    const body = await c.req.valid('json');
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

    // Ambil auth (opsional jika endpoint ini tidak strict) untuk dicatat di log
    const authHeader = c.req.header("Authorization") || null;
    const { user } = await verifyAuth(authHeader, null);
    auditLog("UPDATE_TRANSACTION_ITEMS", user, { id, total_amount, itemsCount: items.length });

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