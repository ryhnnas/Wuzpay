/**
 * WuzPay Date Utilities
 * Semua tanggal diinterpretasikan sebagai WIB (UTC+7) agar konsisten
 * antara Dashboard, Laporan, dan Backend.
 */

const WIB_OFFSET = "+07:00";

/**
 * Parse filter tanggal dari frontend.
 * - Jika format "yyyy-MM-dd" → interpret sebagai WIB
 * - Jika format ISO penuh → pakai langsung
 * 
 * Return: { start, end } sebagai Date UTC yang siap dipakai di MongoDB $gte/$lte
 */
export function parseDateRange(startDate: string, endDate: string) {
  const isSimpleDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  let start: Date;
  let end: Date;

  if (isSimpleDate(startDate)) {
    // "2026-04-07" → 2026-04-07T00:00:00+07:00 → 2026-04-06T17:00:00Z
    start = new Date(`${startDate}T00:00:00${WIB_OFFSET}`);
  } else {
    start = new Date(startDate);
  }

  if (isSimpleDate(endDate)) {
    // "2026-04-07" → 2026-04-07T23:59:59.999+07:00 → 2026-04-07T16:59:59.999Z
    end = new Date(`${endDate}T23:59:59.999${WIB_OFFSET}`);
  } else {
    end = new Date(endDate);
  }

  return { start, end };
}

/**
 * Mendapatkan rentang "hari ini" dalam WIB sebagai UTC Date.
 */
export function getTodayRangeWIB() {
  // Hitung waktu WIB sekarang
  const now = new Date();
  const wibNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const todayStr = wibNow.toISOString().split('T')[0]; // yyyy-MM-dd WIB
  return parseDateRange(todayStr, todayStr);
}

/**
 * Format Date ke string tanggal WIB (yyyy-MM-dd)
 */
export function toWIBDateString(date: Date): string {
  const wib = new Date(date.getTime() + (7 * 60 * 60 * 1000));
  return wib.toISOString().split('T')[0];
}
