import { Hono } from "npm:hono";
import { Ingredient } from "../models/Ingredient.ts";
import { StockLog } from "../models/Product.ts";
import mongoose from "npm:mongoose";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";
import { validateId } from "../middleware/validator.ts";

const ingredientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().optional(),
  stock_quantity: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
  cost_per_unit: z.union([z.string(), z.number()]).transform(v => Number(v)).optional()
});

const validateIngredient = zValidator('json', ingredientSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const ocrBulkSchema = z.object({
  items: z.array(z.object({
    ingredient_id: z.string().optional(),
    name: z.string().optional(),
    unit: z.string().optional(),
    amount: z.union([z.string(), z.number()]),
    price: z.union([z.string(), z.number()]).optional(),
    is_new: z.boolean().optional()
  }))
});

const validateOcrBulk = zValidator('json', ocrBulkSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const addStockSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform(v => Number(v))
});

const validateAddStock = zValidator('json', addStockSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});


const ingredient = new Hono();

// GET: Mengambil semua data bahan baku
ingredient.get("/", async (c) => {
    try {
        const ingredients = await Ingredient.find().sort({ createdAt: -1 });
        return c.json({ data: ingredients });
    } catch (error) {
        return c.json({ error: "Gagal mengambil data bahan baku" }, 500);
    }
});

// POST: Menambah bahan baku baru
ingredient.post("/", validateIngredient, async (c) => {
    try {
        const body = c.req.valid('json');
        // Cek duplikat nama (case-insensitive)
        const existing = await Ingredient.findOne({ name: { $regex: new RegExp(`^${body.name?.trim()}$`, 'i') } });
        if (existing) {
            return c.json({ error: `Bahan baku "${existing.name}" sudah ada dengan satuan "${existing.unit}". Tidak boleh ada nama yang sama.` }, 400);
        }
        const newIngredient = await Ingredient.create(body);
        return c.json({ message: "Bahan baku berhasil ditambahkan", data: newIngredient }, 201);
    } catch (error: any) {
        console.error("Error tambah bahan baku:", error);
        if (error.code === 11000) {
            return c.json({ error: "Nama bahan baku sudah ada di database" }, 400);
        }
        return c.json({ error: "Gagal menambah bahan baku" }, 500);
    }
});

// POST: Menyimpan data hasil scan OCR sekaligus
ingredient.post("/ocr-bulk", validateOcrBulk, async (c) => {
    try {
        const { items } = c.req.valid('json');
        let updatedCount = 0;
        let createdCount = 0;

        for (const item of items) {
            if (item.is_new) {
                // Cek apakah nama sudah ada (hindari duplikat)
                const existing = await Ingredient.findOne({ name: { $regex: new RegExp(`^${item.name?.trim()}$`, 'i') } });
                if (existing) {
                    // Nama sudah ada → tambahkan stok ke yang sudah ada
                    const oldStock = Number(existing.stock_quantity) || 0;
                    existing.stock_quantity = oldStock + Number(item.amount);
                    existing.cost_per_unit = item.price;
                    await existing.save();

                    await StockLog.create({
                        ingredient_id: existing._id,
                        user_id: "System_OCR",
                        previous_stock: oldStock,
                        added_stock: Number(item.amount),
                        current_stock: existing.stock_quantity,
                        type: 'addition',
                        source: 'ocr_scan'
                    });
                    updatedCount++;
                } else {
                    // Benar-benar baru
                    const newIng = await Ingredient.create({
                        name: item.name,
                        unit: item.unit || 'pcs',
                        stock_quantity: Number(item.amount),
                        cost_per_unit: item.price
                    });

                    await StockLog.create({
                        ingredient_id: newIng._id,
                        user_id: "System_OCR",
                        previous_stock: 0,
                        added_stock: Number(item.amount),
                        current_stock: Number(item.amount),
                        type: 'initial',
                        source: 'ocr_scan'
                    });
                    createdCount++;
                }
            } else {
                // Update stok bahan baku yang sudah ada (berdasarkan ID)
                const ing = await Ingredient.findById(item.ingredient_id);
                if (ing) {
                    const oldStock = Number(ing.stock_quantity) || 0;
                    ing.stock_quantity = oldStock + Number(item.amount);
                    ing.cost_per_unit = item.price;
                    await ing.save();

                    await StockLog.create({
                        ingredient_id: ing._id,
                        user_id: "System_OCR",
                        previous_stock: oldStock,
                        added_stock: Number(item.amount),
                        current_stock: ing.stock_quantity,
                        type: 'addition',
                        source: 'ocr_scan'
                    });
                    updatedCount++;
                }
            }
        }
        return c.json({ results: { updated: updatedCount, created: createdCount } });
    } catch (err) {
        console.error("Gagal OCR Bulk:", err);
        return c.json({ error: "Gagal menyimpan data OCR" }, 500);
    }
});

// PUT: Memperbarui data bahan baku (Nama, Unit, Cost)
ingredient.put("/:id", async (c) => {
    const id = c.req.param("id");
    try {
        const body = await c.req.json();
        const updated = await Ingredient.findByIdAndUpdate(id, body, { new: true });
        if (!updated) return c.json({ error: "Bahan baku tidak ditemukan" }, 404);
        return c.json({ message: "Bahan baku berhasil diperbarui", data: updated });
    } catch (error) {
        return c.json({ error: "Gagal memperbarui bahan baku" }, 500);
    }
});

// Rute untuk Update Stok Manual dari Tabel
ingredient.post("/:id/add-stock", validateId, validateAddStock, async (c) => {
    const { id } = c.req.valid('param');
    try {
        const { amount } = c.req.valid('json');

        if (isNaN(amount)) return c.json({ error: "Jumlah tidak valid" }, 400);

        const item = await Ingredient.findById(id);
        if (!item) return c.json({ error: "Bahan baku tidak ditemukan" }, 404);

        const previousStock = Number(item.stock_quantity) || 0;

        // 1. Update stok di koleksi Ingredient
        item.stock_quantity = previousStock + Number(amount);
        await item.save();

        // 2. Catat ke StockLog (Penting untuk history!)
        // Pastikan user_id didapat dari auth jika ada, jika tidak pakai 'admin' dulu untuk testing
        await StockLog.create({
            ingredient_id: item._id,
            user_id: "admin_manual",
            previous_stock: previousStock,
            added_stock: amount,
            current_stock: item.stock_quantity,
            type: amount > 0 ? 'addition' : 'reduction',
            source: 'manual'
        });

        return c.json({ success: true, newStock: item.stock_quantity });
    } catch (err: any) {
        console.error("Error update stok:", err);
        return c.json({ error: err.message }, 500);
    }
});

// DELETE: Menghapus bahan baku
ingredient.delete("/:id", validateId, async (c) => {
    const { id } = c.req.valid('param');
    try {
        const item = await Ingredient.findByIdAndDelete(id);
        if (!item) return c.json({ error: "Bahan baku tidak ditemukan" }, 404);
        return c.json({ success: true, message: `Bahan baku "${item.name}" berhasil dihapus` });
    } catch (err: any) {
        console.error("Error hapus bahan baku:", err);
        return c.json({ error: err.message }, 500);
    }
});

export default ingredient;