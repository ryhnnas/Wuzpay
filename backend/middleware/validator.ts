import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";

export const paramIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format")
});

export const paginationSchema = z.object({
  page: z.string().optional().transform(v => parseInt(v || "1")).pipe(z.number().min(1)),
  limit: z.string().optional().transform(v => parseInt(v || "50")).pipe(z.number().min(1).max(500)),
});

export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const validateId = zValidator('param', paramIdSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

export const validatePagination = zValidator('query', paginationSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

export const validateDateRange = zValidator('query', dateRangeSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});
