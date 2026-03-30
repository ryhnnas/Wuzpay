import mongoose from "npm:mongoose";

const PermissionSchema = new mongoose.Schema({
  role_name: { type: String, required: true, unique: true }, // 'admin', 'kasir', 'owner'
  allowed_menus: { type: [String], default: [] }, // Contoh: ['dashboard', 'products', 'transactions']
}, { timestamps: true });

export const Permission = mongoose.model("Permission", PermissionSchema);