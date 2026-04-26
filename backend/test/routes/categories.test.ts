/**
 * Integration Tests: Category Routes
 * Tests for routes/categories.ts (CRUD)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv, createTestUser, authHeaders } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import categoriesRoutes from "../../routes/categories.ts";
import { Category } from "../../models/Category.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/categories", categoriesRoutes);
  return app;
}

Deno.test({
  name: "Category Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== GET ALL ====================

    await t.step("GET /api/categories - should return empty array", async () => {
      await clearTestDB();
      const res = await app.request("/api/categories");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.categories, []);
    });

    await t.step("GET /api/categories - should return sorted categories", async () => {
      await clearTestDB();
      await Category.create({ name: "Minuman" });
      await Category.create({ name: "Makanan" });

      const res = await app.request("/api/categories");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.categories.length, 2);
      // Should be sorted alphabetically
      assertEquals(body.categories[0].name, "Makanan");
      assertEquals(body.categories[1].name, "Minuman");
    });

    // ==================== CREATE ====================

    await t.step("POST /api/categories - should create category", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/categories", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ name: "Snack", description: "Makanan ringan" }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.category);
      assertEquals(body.category.name, "Snack");
      assertEquals(body.category.description, "Makanan ringan");
    });

    await t.step("POST /api/categories - should reject duplicate name", async () => {
      await clearTestDB();
      const user = await createTestUser();
      await Category.create({ name: "Duplikat" });

      const res = await app.request("/api/categories", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ name: "Duplikat" }),
      });

      assertEquals(res.status, 400);
    });

    await t.step("POST /api/categories - requires auth", async () => {
      const res = await app.request("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "No Auth" }),
      });

      assertEquals(res.status, 401);
    });

    // ==================== UPDATE ====================

    await t.step("PUT /api/categories/:id - should update category", async () => {
      await clearTestDB();
      const user = await createTestUser();
      const cat = await Category.create({ name: "Old Name" });

      const res = await app.request(`/api/categories/${cat._id}`, {
        method: "PUT",
        headers: authHeaders(user),
        body: JSON.stringify({ name: "New Name", description: "Updated" }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.category.name, "New Name");
      assertEquals(body.category.description, "Updated");
    });

    await t.step("PUT /api/categories/:id - non-existent returns 404", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/categories/507f1f77bcf86cd799439011", {
        method: "PUT",
        headers: authHeaders(user),
        body: JSON.stringify({ name: "Ghost" }),
      });

      assertEquals(res.status, 404);
    });

    // ==================== DELETE ====================

    await t.step("DELETE /api/categories/:id - should delete category", async () => {
      await clearTestDB();
      const user = await createTestUser();
      const cat = await Category.create({ name: "To Delete" });

      const res = await app.request(`/api/categories/${cat._id}`, {
        method: "DELETE",
        headers: authHeaders(user),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
    });

    await t.step("DELETE /api/categories/:id - non-existent returns 404", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/categories/507f1f77bcf86cd799439011", {
        method: "DELETE",
        headers: authHeaders(user),
      });

      assertEquals(res.status, 404);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
