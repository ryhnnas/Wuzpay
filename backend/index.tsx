import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { Context } from "npm:hono";
import { secureHeaders } from "npm:hono/secure-headers";
import mongoose from "npm:mongoose"; // Tambahkan ini

// 1. Import Fungsi Koneksi (Kita buat di langkah selanjutnya)
import { connectDB } from "./lib/mongodb.ts";
import { rateLimiter } from "./middleware/rateLimiter.ts";

// Import Modular Routes
import authRoutes from "./routes/auth.ts";
import productRoutes from "./routes/products.ts";
import categoriesRoutes from "./routes/categories.ts";
import transactionRoutes from "./routes/transactions.ts";
import entitiesRoutes from "./routes/entities.ts";
import cashDrawerRoutes from "./routes/cash_drawer.ts";
import analyticsRoutes from "./routes/analytics.ts";
import aiRoutes from "./routes/ai.ts";
import permissionsRoutes from "./routes/permissions.ts";
import pendingOrders from "./routes/pending_orders.ts";
import receiptRoutes from './routes/receipt_settings.ts';
import seedRouter from "./routes/seed.ts";
import ingredientRoutes from "./routes/ingredient.ts";

// Jalankan Koneksi MongoDB
await connectDB();

const app = new Hono();

// Update pesan selamat datang
app.get("/", (c) => c.text("WuzPay POS Backend is Ready!"));

const BASE_PATH = "/api";

// 2. Global Middlewares
app.use('*', logger());
app.use('*', secureHeaders());
app.use("/*", cors({
  origin: [
    "http://localhost:5173",
    "https://wuzpay.vercel.app" // Sesuaikan dengan domain deployment barumu nanti
  ],
  allowHeaders: ["Content-Type", "Authorization", "X-Session-ID"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["X-Session-ID"],
  maxAge: 600,
  credentials: true,
}));

// 3. Route Registration & Rate Limiters

// Global Rate Limiter untuk semua API (Melindungi dari DDOS ringan)
app.use(`${BASE_PATH}/*`, rateLimiter({
  windowMs: 60 * 1000, // 1 menit
  limit: 100,          // Maks 100 request
  message: "Terlalu banyak permintaan API. Harap tunggu 1 menit."
}));

// Strict Rate Limiter khusus AI (Mahal, lindungi ketat)
app.use(`${BASE_PATH}/ai/*`, rateLimiter({
  windowMs: 60 * 1000, // 1 Menit
  limit: 5,            // Maks 5 eksekusi prompt AI 1 menit
  message: "Batas permintaan AI tercapai. Harap tunggu 1 menit untuk melanjutkan."
}));

app.route(`${BASE_PATH}/auth`, authRoutes);
app.route(`${BASE_PATH}/products`, productRoutes);
app.route(`${BASE_PATH}/categories`, categoriesRoutes);
app.route(`${BASE_PATH}/transactions`, transactionRoutes);
app.route(`${BASE_PATH}/cash-drawer`, cashDrawerRoutes);
app.route(`${BASE_PATH}/seed`, seedRouter);
app.route(`${BASE_PATH}/ai`, aiRoutes);
app.route(`${BASE_PATH}/entities`, entitiesRoutes);
app.route(`${BASE_PATH}/analytics`, analyticsRoutes);
app.route("/api/pending-orders", pendingOrders);
app.route(`${BASE_PATH}/permissions`, permissionsRoutes);
app.route(`${BASE_PATH}/receipt-settings`, receiptRoutes);
app.route("/api/ingredients", ingredientRoutes);

// 4. Health Check
app.get("/health", (c: Context) => c.json({
  status: "ok",
  database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  time: new Date().toISOString()
}));

// 5. Start Server
Deno.serve({ port: process.env.PORT || 8000 }, app.fetch);