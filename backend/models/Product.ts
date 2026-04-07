import mongoose from "npm:mongoose";

// Schema untuk Resep (BOM)
const RecipeItemSchema = new mongoose.Schema({
  ingredient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  amount_needed: { type: Number, required: true } // Jumlah bahan yang dipakai
}, { _id: false });

// Schema untuk Log Stok (Melacak Ingredient
const StockLogSchema = new mongoose.Schema({
  ingredient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  user_id: { type: String, required: true },
  previous_stock: Number,
  added_stock: Number,
  current_stock: Number,
  type: { type: String, enum: ['addition', 'reduction', 'initial'], default: 'addition' },
  // Field 'source' untuk melacak dari mana stok ini berubah
  source: { type: String, enum: ['ocr_scan', 'manual', 'sales_deduction'], default: 'manual' }
}, { timestamps: true });

// Schema untuk Produk
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  sku: { type: String, unique: true, sparse: true },
  price: { type: Number, default: 0 },
  // Relasi resep ke dalam produk
  recipe: [RecipeItemSchema],

  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  image_url: String,
  userId: String,
}, { timestamps: true });

export const Product = mongoose.model("Product", ProductSchema);
export const StockLog = mongoose.model("StockLog", StockLogSchema);