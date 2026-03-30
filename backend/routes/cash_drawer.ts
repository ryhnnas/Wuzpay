import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";
import { verifyAuth } from "../middleware/auth.ts";

const cashDrawer = new Hono();

// 1. AMBIL SEMUA DATA
cashDrawer.get("/", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
    const { data, error } = await db
      .from('cash_drawer_sessions')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) throw error;
    return c.json({ cashDrawers: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 2. BUKA KAS BARU (POST)
// ==================== OPEN/CREATE DRAWER (FIXED) ====================
cashDrawer.post("/", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();
    const body = await c.req.json();
    
    // CEK: Apakah user ngisi closing di inputan pertama?
    const hasClosing = body.ending_cash !== null && body.ending_cash !== undefined && body.ending_cash !== "";

    const sessionData = {
      user_id: user.id,
      start_time: new Date().toISOString(),
      starting_cash: Number(body.starting_cash) || 0,
      // SEKARANG KITA MASUKIN ENDING_CASH-NYA MANG!
      ending_cash: hasClosing ? Number(body.ending_cash) : null,
      // STATUSNYA JANGAN DIPAKSA 'OPEN', TAPI TERGANTUNG ADA CLOSING ATAU ENGGAK
      status: hasClosing ? 'closed' : 'open',
      staffname: body.staffname || user.email,
      notes: body.notes || null,
      // Kalau langsung tutup, kasih end_time juga
      end_time: hasClosing ? new Date().toISOString() : null 
    };

    const { data: session, error: insertError } = await db
      .from('cash_drawer_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (insertError) throw insertError;
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

    const db = getSupabase();
    const id = c.req.param('id');
    const body = await c.req.json();

    const updateData: any = {};
    if (body.starting_cash !== undefined) updateData.starting_cash = Number(body.starting_cash);
    if (body.ending_cash !== undefined) {
      updateData.ending_cash = body.ending_cash === null ? null : Number(body.ending_cash);
      updateData.end_time = updateData.ending_cash !== null ? new Date().toISOString() : null;
      updateData.status = updateData.ending_cash !== null ? 'closed' : 'open';
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.staffname !== undefined) updateData.staffname = body.staffname;

    const { data, error } = await db.from('cash_drawer_sessions').update(updateData).eq('id', id).select().single();
    if (error) throw error;
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

    const db = getSupabase();
    const id = c.req.param('id');
    const { error } = await db.from('cash_drawer_sessions').delete().eq('id', id);
    if (error) throw error;
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default cashDrawer;