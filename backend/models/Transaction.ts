import mongoose from "npm:mongoose";

// 1. Schema untuk Item (Disimpan di dalam Transaksi)
const TransactionItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true }, // Denormalisasi nama (agar history aman jika produk dihapus)
  quantity: { type: Number, required: true },
  price_at_sale: { type: Number, required: true },
  cost_at_sale: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  category_name: { type: String, default: "Umum" }
});

// 2. Schema Utama Transaksi
const TransactionSchema = new mongoose.Schema({
  receipt_number: { type: String, unique: true }, 
  userId: { type: String, required: true }, // ID Kasir/Owner
  customer_name: { type: String, default: "Pelanggan Umum" },
  
  // Financials
  total_amount: { type: Number, required: true },      // Neto (Setelah diskon)
  total_real_amount: { type: Number, required: true }, // Bruto (Sebelum diskon)
  discount_amount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },                // Profit Neto
  
  // Payment
  payment_method: { type: String, enum: ['cash', 'qris', 'gopay', 'transfer'], default: 'cash' },
  amount_paid: { type: Number, default: 0 },
  change_amount: { type: Number, default: 0 },
  
  // Items (Embedded Array)
  items: [TransactionItemSchema], 
  
  status: { type: String, default: 'completed' }
}, { 
  timestamps: true // Otomatis membuat createdAt dan updatedAt
});

export const Transaction = mongoose.model("Transaction", TransactionSchema);