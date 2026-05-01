/**
 * Unit Tests: Date Utilities
 * Tests for lib/date.ts (parseDateRange, getTodayRangeWIB, toWIBDateString)
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseDateRange, getTodayRangeWIB, toWIBDateString } from "../../lib/date.ts";

// ==================== parseDateRange ====================

Deno.test("parseDateRange - simple date format (yyyy-MM-dd) should return WIB-based range", () => {
  const { start, end } = parseDateRange("2026-04-07", "2026-04-07");

  // 2026-04-07T00:00:00+07:00 → UTC is 2026-04-06T17:00:00Z
  assertEquals(start.toISOString(), "2026-04-06T17:00:00.000Z");
  // 2026-04-07T23:59:59.999+07:00 → UTC is 2026-04-07T16:59:59.999Z
  assertEquals(end.toISOString(), "2026-04-07T16:59:59.999Z");
});

Deno.test("parseDateRange - simple date format covers full day span", () => {
  const { start, end } = parseDateRange("2026-01-15", "2026-01-15");
  
  // The difference should be approximately 24 hours (minus 1ms)
  const diffMs = end.getTime() - start.getTime();
  const expectedMs = (23 * 60 * 60 + 59 * 60 + 59) * 1000 + 999;
  assertEquals(diffMs, expectedMs);
});

Deno.test("parseDateRange - ISO format dates should be used directly", () => {
  const isoStart = "2026-04-07T00:00:00.000Z";
  const isoEnd = "2026-04-07T23:59:59.999Z";
  
  const { start, end } = parseDateRange(isoStart, isoEnd);
  
  assertEquals(start.toISOString(), isoStart);
  assertEquals(end.toISOString(), isoEnd);
});

Deno.test("parseDateRange - multi-day range should work correctly", () => {
  const { start, end } = parseDateRange("2026-04-01", "2026-04-30");
  
  // Start: April 1 at midnight WIB
  assertEquals(start.toISOString(), "2026-03-31T17:00:00.000Z");
  // End: April 30 at 23:59:59.999 WIB
  assertEquals(end.toISOString(), "2026-04-30T16:59:59.999Z");
});

// ==================== getTodayRangeWIB ====================

Deno.test("getTodayRangeWIB - should return valid start and end dates", () => {
  const { start, end } = getTodayRangeWIB();
  
  assertExists(start);
  assertExists(end);
  // start should be before end
  assertEquals(start.getTime() < end.getTime(), true);
});

Deno.test("getTodayRangeWIB - range should span approximately 24 hours", () => {
  const { start, end } = getTodayRangeWIB();
  
  const diffMs = end.getTime() - start.getTime();
  const expectedMs = (23 * 60 * 60 + 59 * 60 + 59) * 1000 + 999;
  assertEquals(diffMs, expectedMs);
});

// ==================== toWIBDateString ====================

Deno.test("toWIBDateString - UTC midnight should show same date as WIB morning", () => {
  // 2026-04-07T00:00:00Z → WIB: 2026-04-07T07:00:00 → date = 2026-04-07
  const date = new Date("2026-04-07T00:00:00.000Z");
  assertEquals(toWIBDateString(date), "2026-04-07");
});

Deno.test("toWIBDateString - UTC late evening should show next day in WIB", () => {
  // 2026-04-06T18:00:00Z → WIB: 2026-04-07T01:00:00 → date = 2026-04-07
  const date = new Date("2026-04-06T18:00:00.000Z");
  assertEquals(toWIBDateString(date), "2026-04-07");
});

Deno.test("toWIBDateString - UTC afternoon stays on same WIB date", () => {
  // 2026-04-07T10:00:00Z → WIB: 2026-04-07T17:00:00 → date = 2026-04-07
  const date = new Date("2026-04-07T10:00:00.000Z");
  assertEquals(toWIBDateString(date), "2026-04-07");
});
