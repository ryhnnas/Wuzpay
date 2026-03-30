import { Hono } from "npm:hono";
import { Permission } from "../models/Permission.ts";
import { verifyAuth } from "../middleware/auth.ts";

const permissions = new Hono();

// 1. Ambil semua data hak akses (GET)
permissions.get("/", async (c) => {
  try {
    const data = await Permission.find().sort({ role_name: 1 });
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// 2. Update hak akses per role (PUT)
permissions.put("/:roleName", async (c) => {
  try {
    const roleName = c.req.param("roleName");
    const body = await c.req.json();

    // findOneAndUpdate memudahkan kita mencari berdasarkan string 'role_name' bukan cuma ID
    const updatedPermission = await Permission.findOneAndUpdate(
      { role_name: roleName },
      { allowed_menus: body.allowed_menus },
      { new: true, upsert: true } // upsert: true akan membuat data baru jika role belum ada di DB
    );

    return c.json(updatedPermission);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

export default permissions;