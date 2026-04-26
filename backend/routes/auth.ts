import { Hono } from "npm:hono";
import { User } from "../models/User.ts";
import { verifyAuth } from "../middleware/auth.ts";
import bcrypt from "npm:bcryptjs";
import jwt from "npm:jsonwebtoken";
import { z } from "npm:zod";
import { zValidator } from "npm:@hono/zod-validator";
import { validateId } from "../middleware/validator.ts";


const auth = new Hono();
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "supersecretkeywuzpay";

// ==================== ZOD SCHEMAS ====================
const registerSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(1, "Nama tidak boleh kosong"),
  role: z.enum(['owner', 'admin', 'kasir']).optional()
});

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});

// ==================== SIGN UP / REGISTER ====================
auth.post("/register", zValidator('json', registerSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  try {
    const { email, password, name, role } = await c.req.valid('json');

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
auth.post("/login", zValidator('json', loginSchema, (result, c) => {
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
}), async (c) => {
  try {
    const { email, password } = await c.req.valid('json');

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

// ==================== GET CURRENT USER ====================
auth.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;

    const { user, error, status } = await verifyAuth(authHeader, sessionId);
    if (error || !user) return c.json({ error: error || 'Unauthorized' }, status || 401);

    return c.json({ user });
  } catch (err) {
    return c.json({ error: 'Gagal mengambil data user' }, 500);
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
auth.delete('/users/:id', validateId, async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { user, error } = await verifyAuth(authHeader, sessionId);
    if (error) return c.json({ error }, 401);

    if (user.role !== 'owner' && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const { id: targetId } = c.req.valid('param');
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