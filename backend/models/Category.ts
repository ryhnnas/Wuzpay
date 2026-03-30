import mongoose from "npm:mongoose";

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
}, { timestamps: true });

export const Category = mongoose.model("Category", CategorySchema);