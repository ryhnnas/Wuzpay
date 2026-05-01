/**
 * Unit Tests: Validation Utilities (AI Module)
 * Tests for lib/ai/utils/validation.ts
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateDateRange, validateLimit, validateNumber } from "../../lib/ai/utils/validation.ts";

// ==================== validateDateRange ====================

Deno.test("validateDateRange - should pass for non-custom periods", () => {
  // Should not throw for 'today', 'week', 'month'
  validateDateRange("today");
  validateDateRange("week");
  validateDateRange("month");
});

Deno.test("validateDateRange - custom period with valid dates should pass", () => {
  validateDateRange("custom", "2026-01-01", "2026-01-31");
});

Deno.test("validateDateRange - custom period without dates should throw", () => {
  assertThrows(
    () => validateDateRange("custom"),
    Error,
    "start_date dan end_date wajib diisi"
  );
});

Deno.test("validateDateRange - custom period with only start should throw", () => {
  assertThrows(
    () => validateDateRange("custom", "2026-01-01"),
    Error,
    "start_date dan end_date wajib diisi"
  );
});

Deno.test("validateDateRange - custom period with invalid date format should throw", () => {
  assertThrows(
    () => validateDateRange("custom", "not-a-date", "also-not"),
    Error,
    "Format tanggal tidak valid"
  );
});

Deno.test("validateDateRange - custom period with start > end should throw", () => {
  assertThrows(
    () => validateDateRange("custom", "2026-12-31", "2026-01-01"),
    Error,
    "start_date tidak boleh lebih besar dari end_date"
  );
});

// ==================== validateLimit ====================

Deno.test("validateLimit - undefined returns default", () => {
  assertEquals(validateLimit(undefined), 10);
});

Deno.test("validateLimit - null returns default", () => {
  assertEquals(validateLimit(null as any), 10);
});

Deno.test("validateLimit - valid number within max", () => {
  assertEquals(validateLimit(25), 25);
});

Deno.test("validateLimit - value exceeding max should be capped", () => {
  assertEquals(validateLimit(100), 50);
});

Deno.test("validateLimit - zero or negative should return default", () => {
  assertEquals(validateLimit(0), 10);
  assertEquals(validateLimit(-5), 10);
});

Deno.test("validateLimit - NaN input should return default", () => {
  assertEquals(validateLimit(NaN), 10);
});

Deno.test("validateLimit - custom default and max", () => {
  assertEquals(validateLimit(undefined, 5, 20), 5);
  assertEquals(validateLimit(30, 5, 20), 20);
  assertEquals(validateLimit(15, 5, 20), 15);
});

// ==================== validateNumber ====================

Deno.test("validateNumber - undefined returns default", () => {
  assertEquals(validateNumber(undefined, 42), 42);
});

Deno.test("validateNumber - null returns default", () => {
  assertEquals(validateNumber(null, 42), 42);
});

Deno.test("validateNumber - valid number is returned", () => {
  assertEquals(validateNumber(100, 42), 100);
});

Deno.test("validateNumber - string number is coerced", () => {
  assertEquals(validateNumber("50", 42), 50);
});

Deno.test("validateNumber - non-numeric string returns default", () => {
  assertEquals(validateNumber("abc", 42), 42);
});
