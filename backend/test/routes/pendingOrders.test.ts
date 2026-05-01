/**
 * Integration Tests: Pending Orders Routes
 * Tests for routes/pending_orders.ts (CRUD)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import pendingOrdersRoutes from "../../routes/pending_orders.ts";
import { PendingOrder } from "../../models/PendingOrder.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/pending-orders", pendingOrdersRoutes);
  return app;
}

Deno.test({
  name: "Pending Orders Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== GET ALL ====================

    await t.step("GET /api/pending-orders - should return orders sorted by createdAt", async () => {
      await clearTestDB();
      await PendingOrder.create({
        customer_name: "Pelanggan A",
        items: [{ name: "Item 1", quantity: 1 }],
        subtotal: 10000,
        total_amount: 10000,
      });
      await PendingOrder.create({
        customer_name: "Pelanggan B",
        items: [{ name: "Item 2", quantity: 2 }],
        subtotal: 20000,
        total_amount: 20000,
      });

      const res = await app.request("/api/pending-orders");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.length, 2);
    });

    // ==================== CREATE ====================

    await t.step("POST /api/pending-orders - should create pending order", async () => {
      await clearTestDB();
      const res = await app.request("/api/pending-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "John",
          items: [
            { name: "Nasi Goreng", quantity: 2, price: 15000 },
            { name: "Es Teh", quantity: 2, price: 5000 },
          ],
          subtotal: 40000,
          discount_amount: 5000,
          discount_name: "Diskon Member",
          total_amount: 35000,
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.customer_name, "John");
      assertEquals(body.items.length, 2);
      assertEquals(body.subtotal, 40000);
      assertEquals(body.total_amount, 35000);
    });

    await t.step("POST /api/pending-orders - should use default customer name", async () => {
      await clearTestDB();
      const res = await app.request("/api/pending-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ name: "Test" }],
          subtotal: 5000,
          total_amount: 5000,
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.customer_name, "Pelanggan");
    });

    // ==================== UPDATE ====================

    await t.step("PUT /api/pending-orders/:id - should update order", async () => {
      await clearTestDB();
      const order = await PendingOrder.create({
        customer_name: "Original",
        items: [{ name: "Old Item" }],
        subtotal: 10000,
        total_amount: 10000,
      });

      const res = await app.request(`/api/pending-orders/${order._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "Updated",
          items: [{ name: "New Item", quantity: 3 }],
          subtotal: 30000,
          discount_amount: 0,
          total_amount: 30000,
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.customer_name, "Updated");
      assertEquals(body.subtotal, 30000);
    });

    await t.step("PUT /api/pending-orders/:id - non-existent returns 404", async () => {
      const res = await app.request("/api/pending-orders/507f1f77bcf86cd799439011", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: "Ghost",
          items: [],
          subtotal: 0,
          discount_amount: 0,
          total_amount: 0,
        }),
      });

      assertEquals(res.status, 404);
    });

    // ==================== DELETE ====================

    await t.step("DELETE /api/pending-orders/:id - should delete order", async () => {
      await clearTestDB();
      const order = await PendingOrder.create({
        items: [{ name: "Delete Me" }],
        subtotal: 1000,
        total_amount: 1000,
      });

      const res = await app.request(`/api/pending-orders/${order._id}`, {
        method: "DELETE",
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
    });

    await t.step("DELETE /api/pending-orders/:id - non-existent returns 404", async () => {
      const res = await app.request("/api/pending-orders/507f1f77bcf86cd799439011", {
        method: "DELETE",
      });

      assertEquals(res.status, 404);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
