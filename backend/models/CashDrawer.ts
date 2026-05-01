import mongoose from "npm:mongoose";

const CashDrawerSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  staffname: { type: String, required: true },
  start_time: { type: Date, default: Date.now },
  end_time: { type: Date, default: null },
  starting_cash: { type: Number, default: 0 },
  ending_cash: { type: Number, default: null },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  notes: { type: String, default: null }
}, { timestamps: true });

// Indexes
CashDrawerSchema.index({ user_id: 1, status: 1 });

export const CashDrawer = mongoose.model("CashDrawer", CashDrawerSchema);