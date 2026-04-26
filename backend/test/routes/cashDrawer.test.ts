/**
 * Integration Tests: Cash Drawer Routes
 * Tests for routes/cash_drawer.ts (open, close, update, delete)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv, createTestUser, authHeaders } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import cashDrawerRoutes from "../../routes/cash_drawer.ts";
import { CashDrawer } from "../../models/CashDrawer.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/cash-drawer", cashDrawerRoutes);
  return app;
}

Deno.test({
  name: "Cash Drawer Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== GET ALL ====================

    await t.step("GET /api/cash-drawer - should return drawers", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/cash-drawer", {
        headers: authHeaders(user),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.cashDrawers);
      assertEquals(Array.isArray(body.cashDrawers), true);
    });

    await t.step("GET /api/cash-drawer - requires auth", async () => {
      const res = await app.request("/api/cash-drawer");
      assertEquals(res.status, 401);
    });

    // ==================== OPEN DRAWER ====================

    await t.step("POST /api/cash-drawer - should open new drawer", async () => {
      await clearTestDB();
      const user = await createTestUser({ name: "Kasir Budi" });

      const res = await app.request("/api/cash-drawer", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          starting_cash: 200000,
          staffname: "Kasir Budi",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.drawer);
      assertEquals(body.drawer.starting_cash, 200000);
      assertEquals(body.drawer.status, "open");
      assertEquals(body.drawer.ending_cash, null);
    });

    await t.step("POST /api/cash-drawer - should create closed drawer if ending_cash provided", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/cash-drawer", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({
          starting_cash: 100000,
          ending_cash: 350000,
          staffname: "Kasir Test",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.drawer.status, "closed");
      assertEquals(body.drawer.ending_cash, 350000);
    });

    // ==================== UPDATE / CLOSE DRAWER ====================

    await t.step("PUT /api/cash-drawer/:id - should close open drawer", async () => {
      await clearTestDB();
      const user = await createTestUser();

      // Create open drawer
      const createRes = await app.request("/api/cash-drawer", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ starting_cash: 100000, staffname: "Test" }),
      });
      const { drawer } = await createRes.json();

      // Close it
      const res = await app.request(`/api/cash-drawer/${drawer._id}`, {
        method: "PUT",
        headers: authHeaders(user),
        body: JSON.stringify({ ending_cash: 500000 }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.drawer.status, "closed");
      assertEquals(body.drawer.ending_cash, 500000);
    });

    await t.step("PUT /api/cash-drawer/:id - should update notes", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const createRes = await app.request("/api/cash-drawer", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ starting_cash: 100000, staffname: "Test" }),
      });
      const { drawer } = await createRes.json();

      const res = await app.request(`/api/cash-drawer/${drawer._id}`, {
        method: "PUT",
        headers: authHeaders(user),
        body: JSON.stringify({ notes: "Shift pagi, lancar" }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.drawer.notes, "Shift pagi, lancar");
    });

    await t.step("PUT /api/cash-drawer/:id - non-existent returns 404", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/cash-drawer/507f1f77bcf86cd799439011", {
        method: "PUT",
        headers: authHeaders(user),
        body: JSON.stringify({ notes: "test" }),
      });

      assertEquals(res.status, 404);
    });

    // ==================== DELETE ====================

    await t.step("DELETE /api/cash-drawer/:id - should delete drawer", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const createRes = await app.request("/api/cash-drawer", {
        method: "POST",
        headers: authHeaders(user),
        body: JSON.stringify({ starting_cash: 50000, staffname: "Delete Test" }),
      });
      const { drawer } = await createRes.json();

      const res = await app.request(`/api/cash-drawer/${drawer._id}`, {
        method: "DELETE",
        headers: authHeaders(user),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
