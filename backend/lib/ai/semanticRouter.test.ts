import { assertEquals } from "jsr:@std/assert";
import { getRelevantToolsEmbedding } from "./semanticRouter.embedding.ts";
import { getRelevantTools } from "./semanticRouter.ts";

Deno.test("Semantic Router - Keyword Fallback (Sales)", () => {
  const tools = getRelevantTools("Berapa omzet hari ini?");
  const hasSalesSummary = tools.some((t: any) => t.name === "get_sales_summary");
  assertEquals(hasSalesSummary, true);
});

Deno.test("Semantic Router - Keyword Fallback (Inventory)", () => {
  const tools = getRelevantTools("Bahan yang habis apa aja?");
  const hasInventory = tools.some((t: any) => t.name === "get_low_stock_ingredients");
  assertEquals(hasInventory, true);
});

Deno.test("Semantic Router - Embedding without API Key uses fallback", async () => {
  const tools = await getRelevantToolsEmbedding("Stok bahan", "");
  const hasLowStock = tools.some((t: any) => t.name === "get_low_stock_ingredients");
  assertEquals(hasLowStock, true);
});
