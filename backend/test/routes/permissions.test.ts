/**
 * Integration Tests: Permissions Routes
 * Tests for routes/permissions.ts (GET, PUT/upsert)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import permissionsRoutes from "../../routes/permissions.ts";
import { Permission } from "../../models/Permission.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/permissions", permissionsRoutes);
  return app;
}

Deno.test({
  name: "Permissions Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== GET ALL ====================

    await t.step("GET /api/permissions - should return permissions", async () => {
      await clearTestDB();
      await Permission.create({ role_name: "kasir", allowed_menus: ["pos", "transactions"] });
      await Permission.create({ role_name: "admin", allowed_menus: ["pos", "transactions", "products", "settings"] });

      const res = await app.request("/api/permissions");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.length, 2);
    });

    await t.step("GET /api/permissions - should be sorted by role_name", async () => {
      await clearTestDB();
      await Permission.create({ role_name: "owner", allowed_menus: [] });
      await Permission.create({ role_name: "admin", allowed_menus: [] });
      await Permission.create({ role_name: "kasir", allowed_menus: [] });

      const res = await app.request("/api/permissions");
      const body = await res.json();
      assertEquals(body[0].role_name, "admin");
      assertEquals(body[1].role_name, "kasir");
      assertEquals(body[2].role_name, "owner");
    });

    // ==================== UPDATE (UPSERT) ====================

    await t.step("PUT /api/permissions/:roleName - should update existing role", async () => {
      await clearTestDB();
      await Permission.create({ role_name: "kasir", allowed_menus: ["pos"] });

      const res = await app.request("/api/permissions/kasir", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowed_menus: ["pos", "transactions", "dashboard"],
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.role_name, "kasir");
      assertEquals(body.allowed_menus.length, 3);
      assertEquals(body.allowed_menus.includes("dashboard"), true);
    });

    await t.step("PUT /api/permissions/:roleName - should upsert new role", async () => {
      await clearTestDB();

      const res = await app.request("/api/permissions/manager", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowed_menus: ["pos", "products", "reports"],
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.role_name, "manager");
      assertEquals(body.allowed_menus.length, 3);

      // Verify it was persisted
      const perm = await Permission.findOne({ role_name: "manager" });
      assertExists(perm);
    });

    await t.step("PUT /api/permissions/:roleName - should handle empty menus", async () => {
      await clearTestDB();
      await Permission.create({ role_name: "admin", allowed_menus: ["pos", "settings"] });

      const res = await app.request("/api/permissions/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed_menus: [] }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.allowed_menus.length, 0);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
