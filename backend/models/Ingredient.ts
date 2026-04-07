import mongoose from "npm:mongoose";

const IngredientSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // Harus unik
    unit: { type: String, required: true }, // Contoh: "kg", "gram", "pcs"
    stock_quantity: { type: Number, default: 0 }, // Sisa stok
    cost_per_unit: { type: Number, default: 0 }, // Harga modal per unit
}, { timestamps: true });

export const Ingredient = mongoose.model("Ingredient", IngredientSchema);