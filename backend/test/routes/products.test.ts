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
import * as XLSX from "npm:xlsx";

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

    // ==================== EXPORT & IMPORT ====================

    await t.step("GET /api/products/export - should export products with filters", async () => {
      await clearTestDB();
      const catA = await Category.create({ name: "Makanan" });
      const catB = await Category.create({ name: "Minuman" });
      await Product.create({ name: "Nasi Pecel", price: 12000, category_id: catA._id });
      await Product.create({ name: "Es Teh", price: 3000, category_id: catB._id });

      // Export all
      const resAll = await app.request("/api/products/export");
      assertEquals(resAll.status, 200);
      assertEquals(resAll.headers.get("Content-Type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      // Export filtered by category
      const resFiltered = await app.request(`/api/products/export?category_id=${catA._id}`);
      assertEquals(resFiltered.status, 200);
    });

    await t.step("POST /api/products/import - should import and map custom headers", async () => {
      await clearTestDB();
      const user = await createTestUser();

      // Create a mock workbook using sheetjs
      const mockData = [
        ["Nama Produk", "SKU", "Kategori", "Harga Jual", "Harga Beli (HPP)", "Stok Sisa", "Deskripsi"],
        ["Es Jeruk", "MNK-001", "Minuman Dingin", 5000, 2000, 45, "Segar dan nikmat"]
      ];

      const ws = XLSX.utils.aoa_to_sheet(mockData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

      const file = new File([excelBuffer], "test.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const formData = new FormData();
      formData.append("file", file);

      const headers = authHeaders(user);
      delete headers["Content-Type"];

      const req = new Request("http://localhost/api/products/import", {
        method: "POST",
        headers,
        body: formData
      });

      const res = await app.fetch(req);

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.results.added, 1);

      // Verify DB records
      const product = await Product.findOne({ sku: "MNK-001" }).populate("category_id");
      assertExists(product);
      assertEquals(product.name, "Es Jeruk");
      assertEquals(product.price, 5000);
      assertEquals(product.cost_price, 2000);
      assertEquals(product.stock_quantity, 45);
      assertEquals(product.description, "Segar dan nikmat");
      assertExists(product.category_id);
      assertEquals((product.category_id as any).name, "Minuman Dingin");
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
