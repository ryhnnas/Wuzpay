/**
 * Integration Tests: Auth Routes
 * Tests for routes/auth.ts (register, login, /me, /users, delete user)
 * Uses in-memory MongoDB + Hono test client.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestDB, clearTestDB, teardownTestDB, setupTestEnv, createTestUser, authHeaders } from "../setup.ts";

// Setup environment before route imports
setupTestEnv();

import { Hono } from "npm:hono";
import authRoutes from "../../routes/auth.ts";

function createApp() {
  const app = new Hono();
  app.route("/api/auth", authRoutes);
  return app;
}

Deno.test({
  name: "Auth Routes Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await setupTestDB();
    const app = createApp();

    // ==================== REGISTER ====================

    await t.step("POST /api/auth/register - should register new user", async () => {
      await clearTestDB();
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@wuzpay.com",
          password: "password123",
          name: "New User",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.user);
      assertEquals(body.user.email, "newuser@wuzpay.com");
      assertEquals(body.user.name, "New User");
      assertEquals(body.user.role, "kasir"); // Default role
    });

    await t.step("POST /api/auth/register - should register with custom role", async () => {
      await clearTestDB();
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "owner@wuzpay.com",
          password: "password123",
          name: "Owner User",
          role: "owner",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.user.role, "owner");
    });

    await t.step("POST /api/auth/register - should reject duplicate email", async () => {
      await clearTestDB();
      // Create first user
      await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dup@wuzpay.com",
          password: "password123",
          name: "First",
        }),
      });

      // Try duplicate
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "dup@wuzpay.com",
          password: "password456",
          name: "Second",
        }),
      });

      assertEquals(res.status, 400);
      const body = await res.json();
      assertExists(body.error);
    });

    await t.step("POST /api/auth/register - should reject invalid email", async () => {
      await clearTestDB();
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "password123",
          name: "Bad Email",
        }),
      });

      assertEquals(res.status, 400);
    });

    await t.step("POST /api/auth/register - should reject short password", async () => {
      await clearTestDB();
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "short@wuzpay.com",
          password: "abc",
          name: "Short Pass",
        }),
      });

      assertEquals(res.status, 400);
    });

    await t.step("POST /api/auth/register - should reject empty name", async () => {
      await clearTestDB();
      const res = await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "empty@wuzpay.com",
          password: "password123",
          name: "",
        }),
      });

      assertEquals(res.status, 400);
    });

    // ==================== LOGIN ====================

    await t.step("POST /api/auth/login - should login with valid credentials", async () => {
      await clearTestDB();
      // Register first
      await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "login@wuzpay.com",
          password: "password123",
          name: "Login Test",
        }),
      });

      // Then login
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "login@wuzpay.com",
          password: "password123",
        }),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.access_token);
      assertExists(body.session_id);
      assertEquals(body.user.email, "login@wuzpay.com");
    });

    await t.step("POST /api/auth/login - should reject wrong password", async () => {
      await clearTestDB();
      // Register
      await app.request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "wrong@wuzpay.com",
          password: "correctpassword",
          name: "Wrong Pass Test",
        }),
      });

      // Login with wrong password
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "wrong@wuzpay.com",
          password: "wrongpassword",
        }),
      });

      assertEquals(res.status, 400);
    });

    await t.step("POST /api/auth/login - should reject non-existent email", async () => {
      await clearTestDB();
      const res = await app.request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ghost@wuzpay.com",
          password: "password123",
        }),
      });

      assertEquals(res.status, 400);
    });

    // ==================== GET /me ====================

    await t.step("GET /api/auth/me - should return user with valid token", async () => {
      await clearTestDB();
      const user = await createTestUser();

      const res = await app.request("/api/auth/me", {
        headers: authHeaders(user),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.user);
      assertEquals(body.user.email, user.email);
    });

    await t.step("GET /api/auth/me - should reject without token", async () => {
      const res = await app.request("/api/auth/me");
      assertEquals(res.status, 401);
    });

    await t.step("GET /api/auth/me - should reject with invalid token", async () => {
      const res = await app.request("/api/auth/me", {
        headers: {
          "Authorization": "Bearer invalid-token-here",
        },
      });

      assertEquals(res.status, 401);
    });

    // ==================== GET /users ====================

    await t.step("GET /api/auth/users - owner should see all users", async () => {
      await clearTestDB();
      const owner = await createTestUser({ role: "owner" });
      await createTestUser({ email: "kasir@test.com", role: "kasir" });

      const res = await app.request("/api/auth/users", {
        headers: authHeaders(owner),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertExists(body.users);
      assertEquals(body.users.length >= 2, true);
    });

    await t.step("GET /api/auth/users - kasir should be forbidden", async () => {
      await clearTestDB();
      const kasir = await createTestUser({ role: "kasir" });

      const res = await app.request("/api/auth/users", {
        headers: authHeaders(kasir),
      });

      assertEquals(res.status, 403);
    });

    // ==================== DELETE /users/:id ====================

    await t.step("DELETE /api/auth/users/:id - owner can delete kasir", async () => {
      await clearTestDB();
      const owner = await createTestUser({ role: "owner" });
      const kasir = await createTestUser({ email: "del-kasir@test.com", role: "kasir" });

      const res = await app.request(`/api/auth/users/${kasir.id}`, {
        method: "DELETE",
        headers: authHeaders(owner),
      });

      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.success, true);
    });

    await t.step("DELETE /api/auth/users/:id - cannot delete owner", async () => {
      await clearTestDB();
      const owner1 = await createTestUser({ email: "owner1@test.com", role: "owner" });
      const owner2 = await createTestUser({ email: "owner2@test.com", role: "owner" });

      const res = await app.request(`/api/auth/users/${owner2.id}`, {
        method: "DELETE",
        headers: authHeaders(owner1),
      });

      assertEquals(res.status, 400);
    });

    await t.step("DELETE /api/auth/users/:id - non-existent user returns 404", async () => {
      await clearTestDB();
      const owner = await createTestUser({ role: "owner" });
      const fakeId = "507f1f77bcf86cd799439011";

      const res = await app.request(`/api/auth/users/${fakeId}`, {
        method: "DELETE",
        headers: authHeaders(owner),
      });

      assertEquals(res.status, 404);
    });

    // ==================== CLEANUP ====================
    await teardownTestDB();
  },
});
