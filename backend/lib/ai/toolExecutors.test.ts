import { assertEquals } from "jsr:@std/assert";
import { executeTool } from "./toolExecutors.ts";

Deno.test("executeTool - returns error for invalid tool", async () => {
  const result = await executeTool("invalid_tool", {});
  assertEquals(result.error, 'Tool "invalid_tool" tidak dikenali.');
  assertEquals(result.code, 404);
});

// Catatan: Unit test lengkap untuk setiap executor yang berinteraksi dengan Mongoose
// memerlukan setup MongoDB Memory Server atau mock library seperti sinon.
// Di lingkungan CI/CD, kita bisa menjalankan ini terhadap database test.
