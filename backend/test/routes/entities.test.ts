/**
 * Integration Tests: Entity Routes (Customers, Suppliers, Discounts)
 * Tests for routes/entities.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv, createTestUser, authHeaders } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import entitiesRoutes from "../../routes/entities.ts";
import { Customer, Supplier, Discount } from "../../models/Entity.ts";
// Import these so Mongoose registers the models before populate() is called
import "../../models/Product.ts";
import "../../models/Category.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/entities", entitiesRoutes);
  return app;
}

Deno.test({
  name: "Entity Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== CUSTOMERS ====================

    await t.step("GET /api/entities/customers - should return paginated customers", async () => {
      await clearTestDB();
      for (let i = 0; i < 5; i++) {
        await Customer.create({ name: `Customer ${i}`, phone: `0812345678${i}` });
      }

      const res = await app.request("/api/entities/customers?page=1&limit=3");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.customers.length, 3);
      assertEquals(body.meta.total, 5);
    });

    await t.step("POST /api/entities/customers - should create customer", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/entities/customers", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ name: "Budi Santoso", phone: "08123456789" }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.customer.name, "Budi Santoso");
    });

    await t.step("POST /api/entities/customers - requires auth", async () => {
      const res = await app.request("/api/entities/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "No Auth" }),
      });

      assertEquals(res.status, 401);
    });

    // ==================== SUPPLIERS ====================

    await t.step("GET /api/entities/suppliers - should return sorted suppliers", async () => {
      await clearTestDB();
      await Supplier.create({ name: "Zebra Corp" });
      await Supplier.create({ name: "Alpha Inc" });

      const res = await app.request("/api/entities/suppliers");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.suppliers.length, 2);
      assertEquals(body.suppliers[0].name, "Alpha Inc");
    });

    await t.step("POST /api/entities/suppliers - should create supplier", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/entities/suppliers", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          name: "PT Supplier Jaya",
          phone: "021-123456",
          office_address: "Jakarta",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.supplier.name, "PT Supplier Jaya");
    });

    // ==================== DISCOUNTS ====================

    await t.step("GET /api/entities/discounts - should return discounts", async () => {
      await clearTestDB();
      await Discount.create({
        name: "Promo Natal",
        value_type: "percentage",
        value: 15,
        scope: "transaction",
      });

      const res = await app.request("/api/entities/discounts");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.discounts.length, 1);
      assertEquals(body.discounts[0].name, "Promo Natal");
    });

    await t.step("POST /api/entities/discounts - should create percentage discount", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/entities/discounts", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          name: "Diskon Member",
          value_type: "percentage",
          value: 10,
          scope: "transaction",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
      assertEquals(body.discount.name, "Diskon Member");
      assertEquals(body.discount.value, 10);
    });

    await t.step("POST /api/entities/discounts - should create fixed discount", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/entities/discounts", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          name: "Diskon Flat",
          value_type: "fixed",
          value: 5000,
          scope: "transaction",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.discount.value_type, "fixed");
      assertEquals(body.discount.value, 5000);
    });

    // ==================== GENERIC DELETE ====================

    await t.step("DELETE /api/entities/customers/:id - should delete customer", async () => {
      await clearTestDB();
      const customer = await Customer.create({ name: "To Delete" });

      const res = await app.request(`/api/entities/customers/${customer._id}`, {
        method: "DELETE",
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
    });

    await t.step("DELETE /api/entities/suppliers/:id - should delete supplier", async () => {
      await clearTestDB();
      const supplier = await Supplier.create({ name: "To Delete Supplier" });

      const res = await app.request(`/api/entities/suppliers/${supplier._id}`, {
        method: "DELETE",
      });

      assertEquals(res.status, 200);
    });

    await t.step("DELETE /api/entities/discounts/:id - should delete discount", async () => {
      await clearTestDB();
      const discount = await Discount.create({
        name: "To Delete",
        value_type: "fixed",
        value: 1000,
      });

      const res = await app.request(`/api/entities/discounts/${discount._id}`, {
        method: "DELETE",
      });

      assertEquals(res.status, 200);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
