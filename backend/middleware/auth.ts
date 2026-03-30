import jwt from "npm:jsonwebtoken";
import { User } from "../models/User.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "supersecretkeywuzpay";

export async function verifyAuth(authHeader: string | null, sessionId: string | null) {
  // Validasi Header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: 'Akses ditolak, silakan login', user: null, status: 401 };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    // Verifikasi JWT secara manual
    // jwt.verify akan melempar error jika token expired atau invalid
    const decoded: any = jwt.verify(token, JWT_SECRET);

    // Ambil data User terbaru dari MongoDB untuk cek Session & Role
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return { error: 'User sudah tidak aktif', user: null, status: 401 };
    }

    // Force Logout Protection
    // Cek apakah sessionId yang dikirim frontend masih cocok dengan yang ada di DB
    if (sessionId && user.last_session_id !== sessionId) {
      return { 
        error: 'Sesi berakhir atau akun telah login di perangkat lain', 
        user: null, 
        status: 401 
      };
    }

    // Return data user yang sudah bersih
    return {
      user: {
        id: user._id.toString(), // Ubah ObjectId ke String agar frontend tidak bingung
        email: user.email,
        name: user.name,
        role: user.role || 'kasir',
      },
      error: null,
    };

  } catch (error: any) {
    // Handle error spesifik JWT
    if (error.name === "TokenExpiredError") {
      return { error: 'Token expired, silakan login ulang', user: null, status: 401 };
    }
    return { error: 'Token tidak valid', user: null, status: 401 };
  }
}