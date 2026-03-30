import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";
import { verifyAuth } from "../middleware/auth.ts";

const auth = new Hono();

// ==================== SIGN UP ====================
auth.post("/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    
    // Selalu gunakan instance fresh dengan Service Role untuk bypass RLS saat create user
    const dbAdmin = getSupabase();
    
    const { data: authData, error: authError } = await dbAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: role || 'kasir' },
      email_confirm: true
    });
    
    if (authError) return c.json({ error: authError.message }, 400);
    
    return c.json({
      user: { 
        id: authData.user.id, 
        email, 
        name, 
        role: role || 'kasir' 
      }
    });
  } catch (error) {
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

// ==================== SIGN IN ====================
auth.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    // Gunakan instance fresh agar tidak ada sesi lama yang nyangkut
    const db = getSupabase();
    
    const { data, error } = await db.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return c.json({ error: error.message }, 400);

    // --- LOGIKA FORCE LOGOUT ---
    const newSessionId = crypto.randomUUID();

    // Gunakan instance admin untuk mengupdate tabel user_sessions
    const { error: sessionError } = await db
      .from('user_sessions')
      .upsert({ 
        user_id: data.user.id, 
        last_session_id: newSessionId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (sessionError) {
        console.error("Session Save Error:", sessionError);
        return c.json({ error: "Gagal membuat sesi login" }, 500);
    }
    
    return c.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email,
        role: data.user.user_metadata?.role || 'kasir',
      },
      access_token: data.session?.access_token,
      session_id: newSessionId,
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Failed to login' }, 500);
  }
});

// ==================== GET USER ====================
auth.get("/user", async (c) => {
  const authHeader = c.req.header('Authorization') || null;
  const sessionId = c.req.header('X-Session-ID') || null;

  // verifyAuth di middleware akan menggunakan instance Supabase-nya sendiri
  const { user, error, status } = await verifyAuth(authHeader, sessionId);
  
  if (error) {
    return c.json({ error }, status || 401);
  }
  
  return c.json({ user });
});

// ==================== GET REGISTERED USERS ====================
auth.get('/users', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;

    const { user, error, status } = await verifyAuth(authHeader, sessionId);
    if (error) return c.json({ error }, status || 401);

    const role = String(user?.role || '').toLowerCase();
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const db = getSupabase();
    const { data, error: usersError } = await db.auth.admin.listUsers();
    if (usersError) return c.json({ error: usersError.message }, 400);

    const users = (data?.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email,
      role: u.user_metadata?.role || 'kasir',
      created_at: u.created_at,
    }));

    return c.json({ users });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to load users' }, 500);
  }
});

// ==================== CREATE USER (ADMIN/OWNER) ====================
auth.post('/users', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error, status } = await verifyAuth(authHeader, sessionId);
    if (error) return c.json({ error }, status || 401);

    const role = String(user?.role || '').toLowerCase();
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = await c.req.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '').trim();
    const name = String(body?.name || '').trim();
    const newRole = String(body?.role || 'kasir').toLowerCase();

    if (!email || !password || !name) {
      return c.json({ error: 'Nama, email, dan password wajib diisi' }, 400);
    }

    const db = getSupabase();
    const { data, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: newRole },
      email_confirm: true,
    });

    if (createError) return c.json({ error: createError.message }, 400);

    return c.json({
      user: {
        id: data.user?.id,
        name,
        email,
        role: newRole,
      }
    });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to create user' }, 500);
  }
});

// ==================== DELETE USER (ADMIN/OWNER) ====================
auth.delete('/users/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error, status } = await verifyAuth(authHeader, sessionId);
    if (error) return c.json({ error }, status || 401);

    const role = String(user?.role || '').toLowerCase();
    if (role !== 'owner' && role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const targetId = c.req.param('id');
    if (!targetId) return c.json({ error: 'User ID wajib diisi' }, 400);
    if (targetId === user?.id) return c.json({ error: 'Tidak bisa menghapus akun sendiri' }, 400);

    const db = getSupabase();
    const { data: targetUser, error: getUserError } = await db.auth.admin.getUserById(targetId);
    if (getUserError) return c.json({ error: getUserError.message }, 400);

    const targetRole = String(targetUser?.user?.user_metadata?.role || '').toLowerCase();
    if (targetRole === 'owner') {
      return c.json({ error: 'Akun owner tidak bisa dihapus' }, 400);
    }

    const { error: deleteError } = await db.auth.admin.deleteUser(targetId);
    if (deleteError) return c.json({ error: deleteError.message }, 400);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err?.message || 'Failed to delete user' }, 500);
  }
});

export default auth;