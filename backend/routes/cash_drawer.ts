import { Hono } from "npm:hono";
import { CashDrawer } from "../models/CashDrawer.ts";
import { verifyAuth } from "../middleware/auth.ts";

const cashDrawer = new Hono();

// 1. AMBIL SEMUA DATA
cashDrawer.get("/", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const data = await CashDrawer.find().sort({ start_time: -1 });

    return c.json({ cashDrawers: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 2. BUKA KAS BARU (POST)
cashDrawer.post("/", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const body = await c.req.json();
    
    const hasClosing = body.ending_cash !== null && body.ending_cash !== undefined && body.ending_cash !== "";

    const session = await CashDrawer.create({
      user_id: user.id,
      start_time: new Date(),
      starting_cash: Number(body.starting_cash) || 0,
      ending_cash: hasClosing ? Number(body.ending_cash) : null,
      status: hasClosing ? 'closed' : 'open',
      staffname: body.staffname || user.name || user.email,
      notes: body.notes || null,
      end_time: hasClosing ? new Date() : null 
    });

    return c.json({ drawer: session });
  } catch (error: any) {
    console.error('Open drawer error:', error);
    return c.json({ error: error.message || 'Failed to open drawer' }, 500);
  }
});

// 3. UPDATE / EDIT / TUTUP KAS (PUT)
cashDrawer.put("/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const id = c.req.param('id');
    const body = await c.req.json();

    const updateData: any = {};
    if (body.starting_cash !== undefined) updateData.starting_cash = Number(body.starting_cash);
    if (body.ending_cash !== undefined) {
      updateData.ending_cash = body.ending_cash === null ? null : Number(body.ending_cash);
      updateData.end_time = updateData.ending_cash !== null ? new Date() : null;
      updateData.status = updateData.ending_cash !== null ? 'closed' : 'open';
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.staffname !== undefined) updateData.staffname = body.staffname;

    const data = await CashDrawer.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!data) return c.json({ error: "Data tidak ditemukan" }, 404);
    return c.json({ drawer: data });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 4. HAPUS DATA (DELETE)
cashDrawer.delete("/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    await CashDrawer.findByIdAndDelete(c.req.param('id'));
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default cashDrawer;