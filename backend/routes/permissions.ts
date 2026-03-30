import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";
import { verifyAuth } from "../middleware/auth.ts"; // Aktifkan jika ingin proteksi API

const permissions = new Hono();

// 1. Ambil semua data hak akses (GET)
permissions.get("/", async (c) => {
  const db = getSupabase();
  const { data, error } = await db
    .from("role_permissions")
    .select("*")
    .order('role_name', { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 400);
  }
  return c.json(data);
});

// 2. Update hak akses per role (PUT)
permissions.put("/:roleName", async (c) => {
  const db = getSupabase();
  const roleName = c.req.param("roleName");
  const body = await c.req.json();

  // Pastikan kolom di database namanya 'allowed_menus' (sesuai SQL tadi)
  const { data, error } = await db
    .from("role_permissions")
    .update({ 
      allowed_menus: body.allowed_menus 
    })
    .eq("role_name", roleName)
    .select();

  if (error) {
    return c.json({ error: error.message }, 400);
  }

  if (data.length === 0) {
    return c.json({ error: "Role tidak ditemukan" }, 404);
  }

  return c.json(data[0]);
});

export default permissions;