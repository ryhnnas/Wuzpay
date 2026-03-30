import mongoose from "npm:mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Nanti akan di-hash
  role: { type: String, enum: ['owner', 'manager', 'admin', 'kasir'], default: 'kasir' },
  last_session_id: { type: String, default: null },
}, { timestamps: true });

export const User = mongoose.model("User", UserSchema);