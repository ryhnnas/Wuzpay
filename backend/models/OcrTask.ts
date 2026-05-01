import mongoose from "npm:mongoose";

const OcrTaskSchema = new mongoose.Schema({
  file_b64: { type: String, required: true },
  mime_type: { type: String, default: 'image/jpeg' },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  error_message: { type: String, default: null }
}, { timestamps: true });

// Index for the worker to quickly find pending tasks
OcrTaskSchema.index({ status: 1, createdAt: 1 });

export const OcrTask = mongoose.model("OcrTask", OcrTaskSchema);
