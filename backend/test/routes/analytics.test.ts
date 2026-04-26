/**
 * Integration Tests: Analytics Routes
 * Tests for routes/analytics.ts (reports, insights)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv, createTestUser, authHeaders } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import analyticsRoutes from "../../routes/analytics.ts";
import { Transaction } from "../../models/Transaction.ts";
import { Product } from "../../models/Product.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/analytics", analyticsRoutes);
  return app;
}

async function createTestTransactions(userId: string) {
  // Create several transactions with different data
  await Transaction.create({
    userId,
    receipt_number: "WUZ-ANALYTICS-001",
    total_amount: 50000,
    total_real_amount: 50000,
    profit: 20000,
    payment_method: "cash",
    items: [
      { name: "Nasi Goreng", quantity: 2, price_at_sale: 15000, cost_at_sale: 8000, total_amount: 30000, category_name: "Makanan" },
      { name: "Es Teh", quantity: 2, price_at_sale: 10000, cost_at_sale: 3000, total_amount: 20000, category_name: "Minuman" },
    ],
  });

  await Transaction.create({
    userId,
    receipt_number: "WUZ-ANALYTICS-002",
    total_amount: 30000,
    total_real_amount: 35000,
    discount_amount: 5000,
    profit: 12000,
    payment_method: "qris",
    items: [
      { name: "Nasi Goreng", quantity: 1, price_at_sale: 15000, cost_at_sale: 8000, total_amount: 15000, category_name: "Makanan" },
      { name: "Es Jeruk", quantity: 3, price_at_sale: 5000, cost_at_sale: 2000, total_amount: 15000, category_name: "Minuman" },
    ],
  });
}

Deno.test({
  name: "Analytics Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== SALES REPORT ====================

    await t.step("GET /api/analytics/reports/sales - should return sales report", async () => {
      await clearTestDB();
      const user = await createTestUser();
      await createTestTransactions(user.id);

      const res = await app.request("/api/analytics/reports/sales", {
        headers: authHeaders(user),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.report);
      assertEquals(body.report.length > 0, true);
      // Each entry should have date, transactions, revenue, avgTransaction
      const entry = body.report[0];
      assertExists(entry.date);
      assertExists(entry.transactions);
      assertExists(entry.revenue);
      assertExists(entry.avgTransaction);
    });

    await t.step("GET /api/analytics/reports/sales - requires auth", async () => {
      const res = await app.request("/api/analytics/reports/sales");
      assertEquals(res.status, 401);
    });

    // ==================== SUMMARY REPORT ====================

    await t.step("GET /api/analytics/reports/summary - should return financial summary", async () => {
      await clearTestDB();
      const user = await createTestUser();
      await createTestTransactions(user.id);

      const res = await app.request("/api/analytics/reports/summary");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertExists(body.data);
      assertExists(body.data.totalRevenue);
      assertExists(body.data.totalGrossRevenue);
      assertExists(body.data.totalProfit);
      assertExists(body.data.totalDiscount);

      // Revenue should be sum of total_amount
      assertEquals(body.data.totalRevenue, 80000); // 50000 + 30000
      assertEquals(body.data.totalDiscount, 5000);
    });

    await t.step("GET /api/analytics/reports/summary - empty data returns zeros", async () => {
      await clearTestDB();

      const res = await app.request("/api/analytics/reports/summary");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.data.totalRevenue, 0);
      assertEquals(body.data.totalProfit, 0);
    });

    await t.step("GET /api/analytics/reports/summary - with date filter", async () => {
      await clearTestDB();
      const user = await createTestUser();
      await createTestTransactions(user.id);

      const today = new Date().toISOString().split("T")[0];
      const res = await app.request(`/api/analytics/reports/summary?startDate=${today}&endDate=${today}`);
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
    });

    // ==================== PRODUCT SALES ====================

    await t.step("GET /api/analytics/reports/product-sales - should return product breakdown", async () => {
      await clearTestDB();
      const user = await createTestUser();
      await createTestTransactions(user.id);

      const res = await app.request("/api/analytics/reports/product-sales");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.data);
      assertEquals(body.data.length > 0, true);

      // Check Nasi Goreng totals (2 + 1 = 3 qty)
      const nasiGoreng = body.data.find((d: any) => d.name === "Nasi Goreng");
      assertExists(nasiGoreng);
      assertEquals(nasiGoreng.qty, 3);
    });

    // ==================== CATEGORY SALES ====================

    await t.step("GET /api/analytics/reports/category-sales - should return category breakdown", async () => {
      await clearTestDB();
      const user = await createTestUser();
      await createTestTransactions(user.id);

      const res = await app.request("/api/analytics/reports/category-sales");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertExists(body.data);

      // Should have Makanan and Minuman categories
      const categories = body.data.map((d: any) => d.category);
      assertEquals(categories.includes("Makanan"), true);
      assertEquals(categories.includes("Minuman"), true);
    });

    // ==================== QRIS REPORT ====================

    await t.step("GET /api/analytics/reports/qris - should return QRIS transactions", async () => {
      await clearTestDB();
      const user = await createTestUser();
      await createTestTransactions(user.id);

      const res = await app.request("/api/analytics/reports/qris");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertExists(body.data);
      assertExists(body.summary);
      assertEquals(body.summary.count, 1); // Only 1 QRIS transaction
      assertEquals(body.summary.totalAmount, 30000);
    });

    await t.step("GET /api/analytics/reports/qris - no QRIS transactions returns zero", async () => {
      await clearTestDB();

      const res = await app.request("/api/analytics/reports/qris");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.data.length, 0);
      assertEquals(body.summary.totalAmount, 0);
    });

    // ==================== AI INSIGHTS ====================

    await t.step("GET /api/analytics/ai/insights - should return insights array", async () => {
      await clearTestDB();
      const user = await createTestUser();

      // Create today's transaction to trigger performance insight
      await createTestTransactions(user.id);

      const res = await app.request("/api/analytics/ai/insights", {
        headers: authHeaders(user),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.insights);
      assertEquals(Array.isArray(body.insights), true);
    });

    await t.step("GET /api/analytics/ai/insights - requires auth", async () => {
      const res = await app.request("/api/analytics/ai/insights");
      assertEquals(res.status, 401);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
