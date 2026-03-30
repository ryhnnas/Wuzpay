import mongoose from "npm:mongoose";

const ReceiptSettingSchema = new mongoose.Schema({
  // Kita tidak pakai id: 1, tapi pakai key statis agar hanya ada 1 dokumen
  setting_key: { type: String, default: "main_config", unique: true },
  store_name: { type: String, default: "WuzPay Store" },
  address: { type: String, default: "Alamat Toko" },
  footer_text: { type: String, default: "Terima Kasih" },
  logo_url: { type: String, default: "" },
  show_logo: { type: Boolean, default: true },
  paper_size: { type: String, default: "58mm" },
  auto_print: { type: Boolean, default: false },
  max_chars: { type: Number, default: 32 },
  font_family: { type: String, default: "monospace" },
  font_size: { type: Number, default: 12 },
  margin_h: { type: Number, default: 0 },
  margin_b: { type: Number, default: 0 },
}, { timestamps: true });

export const ReceiptSetting = mongoose.model("ReceiptSetting", ReceiptSettingSchema);