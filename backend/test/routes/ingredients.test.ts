/**
 * Integration Tests: Ingredient Routes
 * Tests for routes/ingredient.ts (CRUD, stock management, OCR bulk)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import ingredientRoutes from "../../routes/ingredient.ts";
import { Ingredient } from "../../models/Ingredient.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/ingredients", ingredientRoutes);
  return app;
}

Deno.test({
  name: "Ingredient Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== GET ALL ====================

    await t.step("GET /api/ingredients - should return ingredients", async () => {
      await clearTestDB();
      await Ingredient.create({ name: "Gula", unit: "kg", stock_quantity: 10 });

      const res = await app.request("/api/ingredients");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.data.length, 1);
      assertEquals(body.data[0].name, "Gula");
    });

    await t.step("GET /api/ingredients - should return empty array", async () => {
      await clearTestDB();
      const res = await app.request("/api/ingredients");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.data.length, 0);
    });

    // ==================== CREATE ====================

    await t.step("POST /api/ingredients - should create ingredient", async () => {
      await clearTestDB();
      const res = await app.request("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tepung Terigu",
          unit: "kg",
          stock_quantity: 50,
          cost_per_unit: 8000,
        }),
      });

      assertEquals(res.status, 201);
      const body = await res.json();
      assertEquals(body.data.name, "Tepung Terigu");
      assertEquals(body.data.unit, "kg");
    });

    await t.step("POST /api/ingredients - should reject duplicate name (case-insensitive)", async () => {
      await clearTestDB();
      await Ingredient.create({ name: "garam", unit: "kg" });

      const res = await app.request("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Garam", unit: "gram" }),
      });

      assertEquals(res.status, 400);
      const body = await res.json();
      assertExists(body.error);
    });

    // ==================== ADD STOCK ====================

    await t.step("POST /api/ingredients/:id/add-stock - should add stock", async () => {
      await clearTestDB();
      const ing = await Ingredient.create({
        name: "Minyak",
        unit: "liter",
        stock_quantity: 10,
      });

      const res = await app.request(`/api/ingredients/${ing._id}/add-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 5 }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.newStock, 15);
    });

    await t.step("POST /api/ingredients/:id/add-stock - should reduce stock", async () => {
      await clearTestDB();
      const ing = await Ingredient.create({
        name: "Telur",
        unit: "butir",
        stock_quantity: 100,
      });

      const res = await app.request(`/api/ingredients/${ing._id}/add-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: -20 }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.newStock, 80);
    });

    await t.step("POST /api/ingredients/:id/add-stock - invalid amount returns 400", async () => {
      await clearTestDB();
      const ing = await Ingredient.create({ name: "Bawang", unit: "kg" });

      const res = await app.request(`/api/ingredients/${ing._id}/add-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "abc" }),
      });

      assertEquals(res.status, 400);
    });

    await t.step("POST /api/ingredients/:id/add-stock - non-existent returns 404", async () => {
      const res = await app.request("/api/ingredients/507f1f77bcf86cd799439011/add-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10 }),
      });

      assertEquals(res.status, 404);
    });

    // ==================== OCR BULK ====================

    await t.step("POST /api/ingredients/ocr-bulk - should create new ingredients", async () => {
      await clearTestDB();

      const res = await app.request("/api/ingredients/ocr-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { is_new: true, name: "Kecap", unit: "botol", amount: 5, price: 15000 },
            { is_new: true, name: "Saos", unit: "botol", amount: 3, price: 10000 },
          ],
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.results.created, 2);
    });

    await t.step("POST /api/ingredients/ocr-bulk - should update existing by ID", async () => {
      await clearTestDB();
      const ing = await Ingredient.create({
        name: "Gula",
        unit: "kg",
        stock_quantity: 10,
        cost_per_unit: 12000,
      });

      const res = await app.request("/api/ingredients/ocr-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { is_new: false, ingredient_id: ing._id.toString(), amount: 5, price: 13000 },
          ],
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.results.updated, 1);

      // Verify stock was added
      const updated = await Ingredient.findById(ing._id);
      assertEquals(updated!.stock_quantity, 15);
    });

    await t.step("POST /api/ingredients/ocr-bulk - new item with existing name should merge", async () => {
      await clearTestDB();
      await Ingredient.create({
        name: "Minyak Goreng",
        unit: "liter",
        stock_quantity: 5,
        cost_per_unit: 20000,
      });

      const res = await app.request("/api/ingredients/ocr-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { is_new: true, name: "Minyak Goreng", unit: "liter", amount: 3, price: 21000 },
          ],
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      // Should update (merge) instead of creating new
      assertEquals(body.results.updated, 1);
      assertEquals(body.results.created, 0);

      // Verify merged stock
      const ing = await Ingredient.findOne({ name: "Minyak Goreng" });
      assertEquals(ing!.stock_quantity, 8);
    });

    // ==================== DELETE ====================

    await t.step("DELETE /api/ingredients/:id - should delete ingredient", async () => {
      await clearTestDB();
      const ing = await Ingredient.create({ name: "To Delete", unit: "pcs" });

      const res = await app.request(`/api/ingredients/${ing._id}`, {
        method: "DELETE",
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
    });

    await t.step("DELETE /api/ingredients/:id - non-existent returns 404", async () => {
      const res = await app.request("/api/ingredients/507f1f77bcf86cd799439011", {
        method: "DELETE",
      });

      assertEquals(res.status, 404);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
