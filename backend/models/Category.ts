import mongoose from "npm:mongoose";

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
}, { timestamps: true });

import { invalidateCache } from "../lib/ai/utils/cache.ts";

const invalidateCategoryCache = () => {
  invalidateCache("category_list");
};

CategorySchema.post('save', invalidateCategoryCache);
CategorySchema.post('findOneAndUpdate', invalidateCategoryCache);
CategorySchema.post('updateOne', invalidateCategoryCache);
CategorySchema.post('findOneAndDelete', invalidateCategoryCache);
CategorySchema.post('deleteOne', invalidateCategoryCache);

export const Category = mongoose.model("Category", CategorySchema);