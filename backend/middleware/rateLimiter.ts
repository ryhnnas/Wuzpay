import { Context, Next } from "npm:hono";

interface RateLimitTracker {
  count: number;
  resetTime: number;
}

// Penyimpanan di Memory yang Sangat Cepat
const memoryStore = new Map<string, RateLimitTracker>();

export interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  message?: string;
}

/**
 * Middleware untuk membatasi jumlah request dari satu IP.
 */
export const rateLimiter = (options: RateLimiterOptions) => {
  return async (c: Context, next: Next) => {
    // Ambil IP dari header jika di belakang reverse proxy, atau fallback ke default Deno req info
    const ip = c.req.header("x-forwarded-for")?.split(',')[0]?.trim() || "unknown_ip";
    
    const now = Date.now();
    let record = memoryStore.get(ip);
    
    // Jika tidak ada record, atau window waktu sudah kadaluwarsa, mulai baru
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + options.windowMs };
      memoryStore.set(ip, record);
    } else {
      // Jika masih dalam window, tambah hitungan
      record.count += 1;
      
      if (record.count > options.limit) {
         // Kirim respon HTTP 429 (Too Many Requests) jika melebihi batas
         return c.json({ 
           error: options.message || "Terlalu banyak request, mohon tunggu sebentar." 
         }, 429);
      }
    }
    
    // Pergi ke lapisan selanjutnya
    await next();
  };
};

/**
 * Fungsi utilitas untuk membersihkan memoryStore agar tidak terjadi Memory Leak
 * Sebaiknya dipanggil setiap jam di worker background jika traffic padat
 */
export const cleanupRateLimiter = () => {
    const now = Date.now();
    for (const [ip, record] of memoryStore.entries()) {
        if (now > record.resetTime) {
            memoryStore.delete(ip);
        }
    }
};

// Auto cleanup tiap 1 jam
setInterval(cleanupRateLimiter, 1000 * 60 * 60);
