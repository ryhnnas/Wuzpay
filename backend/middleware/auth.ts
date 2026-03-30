import { createClient } from "npm:@supabase/supabase-js@2";


const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// GANTI verifyAuth kamu jadi ini:
export async function verifyAuth(authHeader: string | null, sessionId: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: 'Unauthorized', user: null, status: 401 };
  }
  
  const token = authHeader.replace("Bearer ", "").trim();
  const db = supabase; // Gunakan instance admin kamu

  // 1. Cek Token JWT dulu
  const { data: { user }, error: authError } = await db.auth.getUser(token);

  // 2. JURUS SAKTI: Jika JWT mati, tapi kita punya sessionId, kita validasi manual
  if (authError || !user) {
    if (!sessionId) return { error: 'Sesi habis, silakan login ulang', user: null, status: 401 };

    // Cek apakah sessionId ini valid di tabel user_sessions
    const { data: sessionData, error: dbError } = await db
      .from('user_sessions')
      .select('user_id')
      .eq('last_session_id', sessionId)
      .single();

    if (dbError || !sessionData) {
      return { error: 'Sesi tidak valid', user: null, status: 401 };
    }

    // Ambil data user secara manual dari admin karena JWT-nya sudah expired
    const { data: adminUser } = await db.auth.admin.getUserById(sessionData.user_id);
    if (!adminUser.user) return { error: 'User tidak ditemukan', user: null, status: 401 };

    return {
      user: {
        id: adminUser.user.id,
        email: adminUser.user.email,
        name: adminUser.user.user_metadata?.name,
        role: adminUser.user.user_metadata?.role || 'kasir',
      },
      error: null,
    };
  }

  // 3. Jika JWT masih hidup, cek juga apakah sessionId-nya masih cocok (Force Logout protection)
  if (sessionId) {
    const { data: currentSession } = await db
      .from('user_sessions')
      .select('last_session_id')
      .eq('user_id', user.id)
      .single();

    if (currentSession && currentSession.last_session_id !== sessionId) {
      return { error: 'Akun login di perangkat lain', user: null, status: 401 };
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name,
      role: user.user_metadata?.role || 'kasir',
    },
    error: null,
  };
}