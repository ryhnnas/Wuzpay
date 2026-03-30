import { Hono } from "npm:hono";
import { User } from "../models/User.ts";
import { verifyAuth } from "../middleware/auth.ts";
import bcrypt from "npm:bcryptjs";
import jwt from "npm:jsonwebtoken";

const auth = new Hono();
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "supersecretkeywuzpay";

// ==================== SIGN UP / REGISTER ====================
auth.post("/register", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();

    // Cek apakah user sudah ada
    const existingUser = await User.findOne({ email });
    if (existingUser) return c.json({ error: "Email sudah terdaftar" }, 400);

    // Hash Password (Wajib untuk keamanan!)
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
      role: role || 'kasir'
    });

    return c.json({
      user: { id: newUser._id, email: newUser.email, name: newUser.name, role: newUser.role }
    });
  } catch (error) {
    console.error("EROR REGISTER:", error.message);
    return c.json({ error: 'Gagal mendaftar user baru' }, 500);
  }
});

// ==================== SIGN IN / LOGIN ====================
auth.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    const user = await User.findOne({ email });
    if (!user) return c.json({ error: "Email atau Password salah" }, 400);

    // Bandingkan password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return c.json({ error: "Email atau Password salah" }, 400);

    // Logika Force Logout / Session ID
    const newSessionId = crypto.randomUUID();
    user.last_session_id = newSessionId;
    await user.save();

    // Buat JWT Token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return c.json({
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
      access_token: token,
      session_id: newSessionId,
    });
  } catch (error) {
    return c.json({ error: 'Gagal login' }, 500);
  }
});

// ==================== GET ALL USERS (ADMIN/OWNER ONLY) ====================
auth.get('/users', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;

    const { user, error } = await verifyAuth(authHeader, sessionId);
    if (error) return c.json({ error }, 401);

    if (user.role !== 'owner' && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const users = await User.find({}, '-password'); // Ambil semua kecuali password
    return c.json({ users });
  } catch (err) {
    return c.json({ error: 'Gagal mengambil data user' }, 500);
  }
});

// ==================== DELETE USER ====================
auth.delete('/users/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error } = await verifyAuth(authHeader, sessionId);
    if (error) return c.json({ error }, 401);

    if (user.role !== 'owner' && user.role !== 'admin') {
        return c.json({ error: 'Forbidden' }, 403);
    }

    const targetId = c.req.param('id');
    const targetUser = await User.findById(targetId);

    if (!targetUser) return c.json({ error: 'User tidak ditemukan' }, 404);
    if (targetUser.role === 'owner') return c.json({ error: 'Akun owner tidak bisa dihapus' }, 400);

    await User.findByIdAndDelete(targetId);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: 'Gagal menghapus user' }, 500);
  }
});

export default auth;