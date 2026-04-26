import { Hono } from "npm:hono";
import { Permission } from "../models/Permission.ts";
import { verifyAuth } from "../middleware/auth.ts";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";

const permissionSchema = z.object({
  allowed_menus: z.array(z.string())
});

const validatePermission = zValidator('json', permissionSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});

const roleNameSchema = z.object({
  roleName: z.string()
});

const validateRoleName = zValidator('param', roleNameSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
});


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
permissions.put("/:roleName", validateRoleName, validatePermission, async (c) => {
  try {
    const { roleName } = c.req.valid('param');
    const body = c.req.valid('json');

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