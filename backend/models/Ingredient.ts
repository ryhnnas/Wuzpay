import mongoose from "npm:mongoose";

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Harus unik
  unit: { type: String, required: true }, // Contoh: "kg", "gram", "pcs"
  stock_quantity: { type: Number, default: 0 }, // Sisa stok
  cost_per_unit: { type: Number, default: 0 }, // Harga modal per unit
}, { timestamps: true });

// Index for low-stock queries
IngredientSchema.index({ stock_quantity: 1 });

import { invalidateCache } from "../lib/ai/utils/cache.ts";

const invalidateIngredientCache = () => {
  invalidateCache("ingredient_list");
  invalidateCache("low_stock_ingredients");
};

IngredientSchema.post('save', invalidateIngredientCache);
IngredientSchema.post('findOneAndUpdate', invalidateIngredientCache);
IngredientSchema.post('updateOne', invalidateIngredientCache);
IngredientSchema.post('findOneAndDelete', invalidateIngredientCache);
IngredientSchema.post('deleteOne', invalidateIngredientCache);

export const Ingredient = mongoose.model("Ingredient", IngredientSchema);
