import mongoose from "npm:mongoose";

// --- Model Customer ---
const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  address: String,
}, { timestamps: true });

// --- Model Supplier ---
const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  phone: String,
  office_address: String,
  contact_info: String,
}, { timestamps: true });

// --- Model Discount (Sistem Terpusat) ---
const DiscountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  value_type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true },
  scope: { type: String, enum: ['transaction', 'category', 'product'], default: 'transaction' },
  is_active: { type: Boolean, default: true },
  start_date: Date,
  end_date: Date,
  // Di MongoDB, kita simpan ID relasi langsung di sini, tidak butuh tabel perantara
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null }
}, { timestamps: true });

export const Customer = mongoose.model("Customer", CustomerSchema);
export const Supplier = mongoose.model("Supplier", SupplierSchema);
export const Discount = mongoose.model("Discount", DiscountSchema);