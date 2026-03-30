import mongoose from "npm:mongoose";

// Schema untuk Log Stok
const StockLogSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user_id: { type: String, required: true },
  previous_stock: Number,
  added_stock: Number,
  current_stock: Number,
  type: { type: String, enum: ['addition', 'reduction', 'initial'], default: 'addition' }
}, { timestamps: true });

// Schema untuk Produk
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  sku: { type: String, unique: true, sparse: true },
  price: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  stock_quantity: { type: Number, default: 0 },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  image_url: String,
  userId: String, // Untuk membedakan data antar user jika perlu
}, { timestamps: true });

export const Product = mongoose.model("Product", ProductSchema);
export const StockLog = mongoose.model("StockLog", StockLogSchema);