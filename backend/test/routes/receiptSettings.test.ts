/**
 * Integration Tests: Receipt Settings Routes
 * Tests for routes/receipt_settings.ts (GET, PUT)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv } from "../setup.ts";

setupTestEnv();

import { Hono } from "npm:hono";
import receiptRoutes from "../../routes/receipt_settings.ts";
import { ReceiptSetting } from "../../models/ReceiptSetting.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/receipt-settings", receiptRoutes);
  return app;
}

Deno.test({
  name: "Receipt Settings Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== GET ====================

    await t.step("GET /api/receipt-settings - should return defaults when empty", async () => {
      await clearTestDB();

      const res = await app.request("/api/receipt-settings");
      assertEquals(res.status, 200);
      const body = await res.json();

      // Should auto-create with default values
      assertEquals(body.store_name, "WuzPay Store");
      assertEquals(body.address, "Alamat Toko");
      assertEquals(body.footer_text, "Terima Kasih");
      assertEquals(body.paper_size, "58mm");
      assertEquals(body.auto_print, false);
      assertEquals(body.max_chars, 32);
    });

    await t.step("GET /api/receipt-settings - should return existing config", async () => {
      await clearTestDB();
      await ReceiptSetting.create({
        setting_key: "main_config",
        store_name: "Toko Makmur",
        address: "Jl. Merdeka 123",
      });

      const res = await app.request("/api/receipt-settings");
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.store_name, "Toko Makmur");
      assertEquals(body.address, "Jl. Merdeka 123");
    });

    // ==================== PUT ====================

    await t.step("PUT /api/receipt-settings - should update settings", async () => {
      await clearTestDB();

      const res = await app.request("/api/receipt-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: "Warung Sejahtera",
          address: "Jl. Raya 456",
          footer_text: "Semoga Berkah!",
          paper_size: "80mm",
          auto_print: true,
          max_chars: 48,
          font_family: "Arial",
          font_size: 14,
          margin_h: 10,
          margin_b: 5,
          show_logo: false,
          logo_url: "https://example.com/logo.png",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.message);
      assertEquals(body.data.store_name, "Warung Sejahtera");
      assertEquals(body.data.paper_size, "80mm");
      assertEquals(body.data.auto_print, true);
      assertEquals(body.data.max_chars, 48);
      assertEquals(body.data.font_family, "Arial");
      assertEquals(body.data.font_size, 14);
      assertEquals(body.data.margin_h, 10);
      assertEquals(body.data.show_logo, false);
    });

    await t.step("PUT /api/receipt-settings - partial update should work", async () => {
      await clearTestDB();
      await ReceiptSetting.create({
        setting_key: "main_config",
        store_name: "Original Store",
        footer_text: "Thanks!",
      });

      const res = await app.request("/api/receipt-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: "Updated Store",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.data.store_name, "Updated Store");
    });

    await t.step("PUT /api/receipt-settings - should upsert if no config exists", async () => {
      await clearTestDB();

      const res = await app.request("/api/receipt-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: "New Store",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.data.store_name, "New Store");

      // Verify it was created in DB
      const config = await ReceiptSetting.findOne({ setting_key: "main_config" });
      assertExists(config);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
