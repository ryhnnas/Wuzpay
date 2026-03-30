import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { Context } from "npm:hono";

// Import Modular Routes
import authRoutes from "./routes/auth.ts";
import productRoutes from "./routes/products.ts";
import categoriesRoutes from "./routes/categories.ts";
import transactionRoutes from "./routes/transactions.ts";
import entitiesRoutes from "./routes/entities.ts";
import cashDrawerRoutes from "./routes/cash_drawer.ts";
import analyticsRoutes from "./routes/analytics.ts";
import seedRoutes from "./routes/seed.ts";
import aiRoutes from "./routes/ai.ts";
import permissionsRoutes from "./routes/permissions.ts";

// Tambahkan baris ini di jajaran import routes
import pendingOrders from "./routes/pending_orders.ts";
import receiptRoutes from './routes/receipt_settings.ts';

const app = new Hono();
app.get("/", (c) => c.text("Nexera POS Backend is Mledakkk!"));

const BASE_PATH = "/api";

// 1. Global Middlewares
app.use('*', logger());
app.use("/*", cors({
    origin: [
    "http://localhost:5173", 
    "https://nexerapos.vercel.app"
  ],
  // TAMBAHKAN "X-Session-ID" ke dalam array di bawah ini
  allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info", "X-Session-ID"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // EXPOSE header jika kamu ingin frontend bisa membaca header tertentu dari response
  exposeHeaders: ["X-Session-ID"],
  maxAge: 600,
  credentials: true,
}));

// 2. Route Registration
app.route(`${BASE_PATH}/auth`, authRoutes);
app.route(`${BASE_PATH}/products`, productRoutes);
app.route(`${BASE_PATH}/categories`, categoriesRoutes);
app.route(`${BASE_PATH}/transactions`, transactionRoutes);
app.route(`${BASE_PATH}/cash-drawer`, cashDrawerRoutes);
app.route(`${BASE_PATH}/seed`, seedRoutes);
app.route(`${BASE_PATH}/ai`, aiRoutes);

// Gabungkan entities dan analytics agar tidak berebut root BASE_PATH
app.route(`${BASE_PATH}`, entitiesRoutes); 
app.route(`${BASE_PATH}/analytics`, analyticsRoutes);

app.route("/api/pending-orders", pendingOrders);
app.route(`${BASE_PATH}/permissions`, permissionsRoutes);
app.route(`${BASE_PATH}/settings/receipt`, receiptRoutes);

// 3. Health Check
app.get("/health", (c: Context) => c.json({ status: "ok", time: new Date().toISOString() }));

Deno.serve({ port: 8080 }, app.fetch);
