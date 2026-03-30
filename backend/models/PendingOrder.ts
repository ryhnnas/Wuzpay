import mongoose from "npm:mongoose";

const PendingOrderSchema = new mongoose.Schema({
  customer_name: { type: String, default: "Pelanggan" },
  items: { type: Array, required: true }, // Menyimpan array objek belanjaan
  subtotal: { type: Number, required: true },
  discount_amount: { type: Number, default: 0 },
  discount_name: { type: String, default: null },
  selected_discount_id: { type: String, default: null },
  total_amount: { type: Number, required: true }
}, { timestamps: true });

export const PendingOrder = mongoose.model("PendingOrder", PendingOrderSchema);