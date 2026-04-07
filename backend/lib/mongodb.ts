import mongoose from "npm:mongoose";

const MONGO_URI = Deno.env.get("MONGO_URI");

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;
    
    await mongoose.connect(MONGO_URI!, {
      serverSelectionTimeoutMS: 5000, // Timeout dalam 5 detik jika server tidak merespon
      socketTimeoutMS: 45000,         // Menutup socket yang sudah terlalu lama inaktif
      connectTimeoutMS: 10000,        // Timeout 10 detik untuk koneksi awal
    });
    
    console.log("🚀 MongoDB Atlas Terkoneksi (WuzPay) ✅");

    // Tangani event pemutusan koneksi untuk auto-reconnect dan logging
    mongoose.connection.on('disconnected', () => {
      console.warn("⚠️ Koneksi MongoDB terputus! Mongoose akan mencoba auto-reconnect...");
    });

    mongoose.connection.on('reconnected', () => {
      console.log("🔄 Berhasil terhubung kembali ke MongoDB!");
    });

    mongoose.connection.on('error', (err) => {
      console.error("❌ Terjadi kesalahan pada koneksi MongoDB:", err);
    });

  } catch (error) {
    console.error("❌ Gagal koneksi ke MongoDB:", error);
  }
};

export const db = mongoose.connection;