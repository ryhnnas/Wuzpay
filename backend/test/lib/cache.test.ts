/**
 * Unit Tests: Cache Utility (AI Module)
 * Tests for lib/ai/utils/cache.ts
 * 
 * Note: sanitizeOps/sanitizeResources disabled because LRU cache uses internal timers.
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getCache, setCache, invalidateCache } from "../../lib/ai/utils/cache.ts";

Deno.test({
  name: "Cache Test Suite",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async (t) => {
    await t.step("setCache and getCache should store and retrieve data", () => {
      setCache("test_key_1", { hello: "world" });
      const result = getCache("test_key_1");
      assertEquals(result, { hello: "world" });
    });

    await t.step("getCache should return null for non-existent keys", () => {
      const result = getCache("non_existent_key_" + Date.now());
      assertEquals(result, null);
    });

    await t.step("setCache should overwrite existing key", () => {
      setCache("overwrite_key", "first");
      setCache("overwrite_key", "second");
      assertEquals(getCache("overwrite_key"), "second");
    });

    await t.step("invalidateCache should remove matching keys", () => {
      setCache("product_list_a", "data_a");
      setCache("product_list_b", "data_b");
      setCache("category_list_a", "data_c");

      invalidateCache("product_list");

      assertEquals(getCache("product_list_a"), null);
      assertEquals(getCache("product_list_b"), null);
      // category_list should remain
      assertEquals(getCache("category_list_a"), "data_c");
    });

    await t.step("invalidateCache with no matches should be safe", () => {
      // Should not throw
      invalidateCache("zzz_nonexistent_prefix");
    });

    await t.step("setCache with custom TTL should work", () => {
      // Set with a very long TTL
      setCache("ttl_key", "alive", 60000);
      assertEquals(getCache("ttl_key"), "alive");
    });

    await t.step("stores various data types", () => {
      setCache("type_string", "hello");
      setCache("type_number", 42);
      setCache("type_array", [1, 2, 3]);
      setCache("type_object", { nested: { deep: true } });
      setCache("type_null", null);

      assertEquals(getCache("type_string"), "hello");
      assertEquals(getCache("type_number"), 42);
      assertEquals(getCache("type_array"), [1, 2, 3]);
      assertEquals(getCache("type_object"), { nested: { deep: true } });
      assertEquals(getCache("type_null"), null);
    });
  },
});
