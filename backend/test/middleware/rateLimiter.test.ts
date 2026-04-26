/**
 * Unit Tests: Rate Limiter Middleware
 * Tests for middleware/rateLimiter.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Hono } from "npm:hono";
import { rateLimiter } from "../../middleware/rateLimiter.ts";

function createTestApp(options: { windowMs: number; limit: number; message?: string }) {
  const app = new Hono();
  app.use("/*", rateLimiter(options));
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

Deno.test("rateLimiter - should allow requests within limit", async () => {
  const app = createTestApp({ windowMs: 60000, limit: 5 });

  for (let i = 0; i < 5; i++) {
    const res = await app.request("/test", {
      headers: { "x-forwarded-for": "192.168.1.100" },
    });
    assertEquals(res.status, 200);
  }
});

Deno.test("rateLimiter - should block requests exceeding limit", async () => {
  const app = createTestApp({ windowMs: 60000, limit: 3 });
  const ip = "192.168.1.201";

  // First 3 should pass
  for (let i = 0; i < 3; i++) {
    const res = await app.request("/test", {
      headers: { "x-forwarded-for": ip },
    });
    assertEquals(res.status, 200);
  }

  // 4th should be blocked
  const blocked = await app.request("/test", {
    headers: { "x-forwarded-for": ip },
  });
  assertEquals(blocked.status, 429);
});

Deno.test("rateLimiter - should return custom message when blocked", async () => {
  const customMsg = "Tunggu sebentar ya!";
  const app = createTestApp({ windowMs: 60000, limit: 1, message: customMsg });
  const ip = "192.168.1.202";

  // First passes
  await app.request("/test", {
    headers: { "x-forwarded-for": ip },
  });

  // Second should be blocked with custom message
  const blocked = await app.request("/test", {
    headers: { "x-forwarded-for": ip },
  });
  assertEquals(blocked.status, 429);
  const body = await blocked.json();
  assertEquals(body.error, customMsg);
});

Deno.test("rateLimiter - different IPs should have separate counters", async () => {
  const app = createTestApp({ windowMs: 60000, limit: 2 });

  // IP A makes 2 requests
  for (let i = 0; i < 2; i++) {
    await app.request("/test", {
      headers: { "x-forwarded-for": "10.0.0.1" },
    });
  }

  // IP A is now blocked
  const blockedA = await app.request("/test", {
    headers: { "x-forwarded-for": "10.0.0.1" },
  });
  assertEquals(blockedA.status, 429);

  // IP B should still be allowed
  const resB = await app.request("/test", {
    headers: { "x-forwarded-for": "10.0.0.2" },
  });
  assertEquals(resB.status, 200);
});

Deno.test("rateLimiter - unknown IP fallback should work", async () => {
  const app = createTestApp({ windowMs: 60000, limit: 5 });

  // No x-forwarded-for header, should default to "unknown_ip"
  const res = await app.request("/test");
  assertEquals(res.status, 200);
});
