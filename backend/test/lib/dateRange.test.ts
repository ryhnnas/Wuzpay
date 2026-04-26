/**
 * Unit Tests: Date Range Utility (AI Module)
 * Tests for lib/ai/utils/dateRange.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getDateRange, getGlobalTimezone } from "../../lib/ai/utils/dateRange.ts";

// ==================== getGlobalTimezone ====================

Deno.test("getGlobalTimezone - should return a valid timezone string", () => {
  const tz = getGlobalTimezone();
  assertExists(tz);
  assertEquals(typeof tz, "string");
  assertEquals(tz.length > 0, true);
});

// ==================== getDateRange ====================

Deno.test("getDateRange - 'today' should return same-day range", () => {
  const { start, end } = getDateRange("today");
  
  assertExists(start);
  assertExists(end);
  
  // Both should be valid dates
  assertEquals(start instanceof Date, true);
  assertEquals(end instanceof Date, true);
  
  // start should be before end
  assertEquals(start.getTime() < end.getTime(), true);
  
  // Difference should be exactly 24 hours
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  assertEquals(diffHours, 24);
});

Deno.test("getDateRange - 'week' should span 7 days", () => {
  const { start, end } = getDateRange("week");
  
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  assertEquals(diffDays, 8); // 7 days back + today = 8 day window
});

Deno.test("getDateRange - 'month' should span 30 days", () => {
  const { start, end } = getDateRange("month");
  
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  assertEquals(diffDays, 31); // 30 days back + today = 31 day window
});

Deno.test("getDateRange - default period should behave like 'month'", () => {
  const { start: monthStart, end: monthEnd } = getDateRange("month");
  const { start: defaultStart, end: defaultEnd } = getDateRange("unknown_period");
  
  // Both should produce same time span
  const monthDiff = monthEnd.getTime() - monthStart.getTime();
  const defaultDiff = defaultEnd.getTime() - defaultStart.getTime();
  assertEquals(monthDiff, defaultDiff);
});

Deno.test("getDateRange - 'custom' with valid dates should work", () => {
  const { start, end } = getDateRange("custom", "2026-04-01", "2026-04-30");
  
  // Start should be April 1
  assertEquals(start.getMonth(), 3); // 0-indexed, April = 3
  assertEquals(start.getDate(), 1);
  
  // End should be May 1 (April 30 + 1 day for inclusive)
  assertEquals(end.getMonth(), 4); // May = 4
  assertEquals(end.getDate(), 1);
});

Deno.test("getDateRange - 'custom' without dates should fallback to month", () => {
  // When startDate or endDate is missing, it falls through to the default
  const { start, end } = getDateRange("custom");
  
  // Should fallback to month-like behavior
  assertExists(start);
  assertExists(end);
  assertEquals(start.getTime() < end.getTime(), true);
});
