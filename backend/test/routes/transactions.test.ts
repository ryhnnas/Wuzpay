/**
 * Integration Tests: Transaction Routes
 * Tests for routes/transactions.ts (GET, CREATE, UPDATE, GET BY ID)
 * 
 * Note: CREATE uses mongoose.startSession() which requires a replica set.
 * The test setup uses MongoMemoryReplSet to support this.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv, createTestUser, authHeaders } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import transactionRoutes from "../../routes/transactions.ts";
import { Transaction } from "../../models/Transaction.ts";
import { Product } from "../../models/Product.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/transactions", transactionRoutes);
  return app;
}

Deno.test({
  name: "Transaction Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== GET ALL ====================

    await t.step("GET /api/transactions - should return paginated transactions", async () => {
      await clearTestDB();
      const user = await createTestUser();

      // Create test transactions
      for (let i = 0; i < 3; i++) {
        await Transaction.create({
          userId: user.id,
          receipt_number: `WUZ-TEST-${i}`,
          total_amount: 10000 * (i + 1),
          total_real_amount: 10000 * (i + 1),
          items: [{ name: `Item ${i}`, quantity: 1, price_at_sale: 10000 * (i + 1), total_amount: 10000 * (i + 1) }],
        });
      }

      const res = await app.request("/api/transactions?page=1&limit=2", {
        headers: authHeaders(user),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.data.length, 2);
      assertEquals(body.meta.total, 3);
      assertEquals(body.meta.total_pages, 2);
    });

    await t.step("GET /api/transactions - requires auth", async () => {
      const res = await app.request("/api/transactions");
      assertEquals(res.status, 401);
    });

    // ==================== CREATE TRANSACTION ====================

    await t.step("POST /api/transactions - should create transaction with product", async () => {
      await clearTestDB();
      const user = await createTestUser();
      const product = await Product.create({
        name: "Nasi Goreng",
        price: 15000,
      });

      const res = await app.request("/api/transactions", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          total_real_amount: 15000,
          payment_method: "cash",
          items: [{
            product_id: product._id.toString(),
            name: "Nasi Goreng",
            quantity: 1,
            price_at_sale: 15000,
          }],
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertExists(body.transaction);
      assertExists(body.transaction.receipt_number);
      assertEquals(body.transaction.items.length, 1);
    });

    await t.step("POST /api/transactions - should reject empty items", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/transactions", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          total_real_amount: 0,
          items: [],
        }),
      });

      assertEquals(res.status, 400);
    });

    await t.step("POST /api/transactions - requires auth", async () => {
      const res = await app.request("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_real_amount: 10000,
          items: [{ name: "Test", quantity: 1 }],
        }),
      });

      assertEquals(res.status, 401);
    });

    await t.step("POST /api/transactions - should calculate discount correctly", async () => {
      await clearTestDB();
      const user = await createTestUser();
      const product = await Product.create({
        name: "Mie Goreng",
        price: 12000,
      });

      const res = await app.request("/api/transactions", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          total_real_amount: 12000,
          discount_amount: 2000,
          payment_method: "cash",
          items: [{
            product_id: product._id.toString(),
            name: "Mie Goreng",
            quantity: 1,
            price_at_sale: 12000,
          }],
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.transaction.total_amount, 10000); // 12000 - 2000
      assertEquals(body.transaction.discount_amount, 2000);
    });

    // ==================== GET BY ID ====================

    await t.step("GET /api/transactions/:id - should return transaction", async () => {
      await clearTestDB();
      const tx = await Transaction.create({
        userId: "user123",
        receipt_number: "WUZ-GET-001",
        total_amount: 20000,
        total_real_amount: 20000,
        items: [{ name: "Test", quantity: 1, price_at_sale: 20000, total_amount: 20000 }],
      });

      const res = await app.request(`/api/transactions/${tx._id}`);
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.receipt_number, "WUZ-GET-001");
    });

    await t.step("GET /api/transactions/:id - non-existent returns 404", async () => {
      const res = await app.request("/api/transactions/507f1f77bcf86cd799439011");
      assertEquals(res.status, 404);
    });

    await t.step("GET /api/transactions/:id - invalid id returns 400", async () => {
      const res = await app.request("/api/transactions/invalid-id");
      assertEquals(res.status, 400);
    });

    // ==================== UPDATE ITEMS ====================

    await t.step("PUT /api/transactions/:id/items - should update transaction items", async () => {
      await clearTestDB();
      const user = await createTestUser();
      const tx = await Transaction.create({
        userId: user.id,
        receipt_number: "WUZ-UPD-001",
        total_amount: 10000,
        total_real_amount: 10000,
        items: [{ name: "Original", quantity: 1, price_at_sale: 10000, total_amount: 10000 }],
      });

      const res = await app.request(`/api/transactions/${tx._id}/items`, {
        method: "PUT",
        headers: authHeaders(user),
        body: JSON.stringify({
          total_amount: 25000,
          total_real_amount: 25000,
          profit: 10000,
          items: [
            { name: "Updated 1", quantity: 2, price_at_sale: 10000 },
            { name: "Updated 2", quantity: 1, price_at_sale: 5000 },
          ],
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.data.items.length, 2);
      assertEquals(body.data.total_amount, 25000);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
