/**
 * Integration Tests: Product Routes
 * Tests for routes/products.ts (CRUD, stock management)
 * Uses in-memory MongoDB + Hono test client.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv, createTestUser, authHeaders } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import productRoutes from "../../routes/products.ts";
import { Product } from "../../models/Product.ts";
import { Category } from "../../models/Category.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/products", productRoutes);
  return app;
}

Deno.test({
  name: "Product Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== GET ALL PRODUCTS ====================

    await t.step("GET /api/products - should return empty array initially", async () => {
      await clearTestDB();
      const res = await app.request("/api/products");

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.products, []);
      assertEquals(body.meta.total, 0);
    });

    await t.step("GET /api/products - should return products with pagination", async () => {
      await clearTestDB();
      // Create 5 products
      for (let i = 0; i < 5; i++) {
        await Product.create({ name: `Product ${String.fromCharCode(65 + i)}`, price: 1000 * (i + 1) });
      }

      const res = await app.request("/api/products?page=1&limit=3");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.products.length, 3);
      assertEquals(body.meta.total, 5);
      assertEquals(body.meta.total_pages, 2);
    });

    await t.step("GET /api/products - page 2 should return remaining products", async () => {
      // Data from previous step persists within same test suite
      const res = await app.request("/api/products?page=2&limit=3");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.products.length, 2);
    });

    // ==================== GET PRODUCT BY ID ====================

    await t.step("GET /api/products/:id - should return product", async () => {
      await clearTestDB();
      // Create a category first so populate works
      const category = await Category.create({ name: "Test Category" });
      const product = await Product.create({ name: "Test Get", price: 15000, category_id: category._id });

      const res = await app.request(`/api/products/${product._id}`);
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.product.name, "Test Get");
    });

    await t.step("GET /api/products/:id - non-existent returns 404", async () => {
      const res = await app.request("/api/products/507f1f77bcf86cd799439011");
      assertEquals(res.status, 404);
    });

    await t.step("GET /api/products/:id - invalid id returns 400", async () => {
      const res = await app.request("/api/products/invalid-id");
      assertEquals(res.status, 400);
    });

    // ==================== CREATE PRODUCT ====================

    await t.step("POST /api/products - should create product", async () => {
      await clearTestDB();
      const res = await app.request("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Nasi Goreng",
          price: 15000,
          cost: 8000,
          stock_quantity: 100,
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.product);
      assertEquals(body.product.name, "Nasi Goreng");
      assertEquals(body.product.price, 15000);
    });

    await t.step("POST /api/products - should convert price strings to numbers", async () => {
      await clearTestDB();
      const res = await app.request("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "String Price",
          price: "25000",
          cost: "10000",
          stock_quantity: "50",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.product.price, 25000);
    });

    // ==================== UPDATE PRODUCT ====================

    await t.step("PUT /api/products/:id - should update product", async () => {
      await clearTestDB();
      const product = await Product.create({
        name: "Original",
        price: 10000,
      });

      const res = await app.request(`/api/products/${product._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated",
          price: 20000,
          cost: 10000,
          stock_quantity: 20,
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.product.name, "Updated");
      assertEquals(body.product.price, 20000);
    });

    await t.step("PUT /api/products/:id - non-existent returns 404", async () => {
      const res = await app.request("/api/products/507f1f77bcf86cd799439011", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ghost", price: 0, cost: 0, stock_quantity: 0 }),
      });

      assertEquals(res.status, 404);
    });

    // ==================== DELETE PRODUCT ====================

    await t.step("DELETE /api/products/:id - should delete product", async () => {
      await clearTestDB();
      const product = await Product.create({ name: "To Delete", price: 5000 });

      const res = await app.request(`/api/products/${product._id}`, {
        method: "DELETE",
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);

      // Verify deletion
      const found = await Product.findById(product._id);
      assertEquals(found, null);
    });

    await t.step("DELETE /api/products/:id - non-existent returns 404", async () => {
      const res = await app.request("/api/products/507f1f77bcf86cd799439011", {
        method: "DELETE",
      });

      assertEquals(res.status, 404);
    });

    // ==================== STOCK LOGS ====================

    await t.step("GET /api/products/stock/logs - should return logs", async () => {
      await clearTestDB();
      const res = await app.request("/api/products/stock/logs");

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.logs);
      assertEquals(Array.isArray(body.logs), true);
    });

    // ==================== ADD STOCK ====================

    await t.step("POST /api/products/:id/add-stock - requires auth", async () => {
      await clearTestDB();
      const product = await Product.create({ name: "No Auth", price: 5000 });

      const res = await app.request(`/api/products/${product._id}/add-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10 }),
      });

      assertEquals(res.status, 401);
    });

    await t.step("POST /api/products/:id/add-stock - non-existent product returns 404", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/products/507f1f77bcf86cd799439011/add-stock", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ amount: 10 }),
      });

      assertEquals(res.status, 404);
    });

    // ==================== BULK ADD STOCK ====================

    await t.step("POST /api/products/bulk-add-stock - empty items returns 400", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/products/bulk-add-stock", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ items: [] }),
      });

      assertEquals(res.status, 400);
    });

    await t.step("POST /api/products/bulk-add-stock - requires auth", async () => {
      const res = await app.request("/api/products/bulk-add-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ product_id: "abc", amount: 5 }] }),
      });

      assertEquals(res.status, 401);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
