import mongoose from "npm:mongoose";

const MONGO_URI = Deno.env.get("MONGO_URI");

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;
    
    await mongoose.connect(MONGO_URI!);
    console.log("🚀 MongoDB Atlas Terkoneksi (WuzPay) ✅");
  } catch (error) {
    console.error("❌ Gagal koneksi ke MongoDB:", error);
  }
};

export const db = mongoose.connection;