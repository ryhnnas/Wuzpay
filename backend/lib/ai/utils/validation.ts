import { Period } from "../types.ts";

export function validateDateRange(period?: Period, startDate?: string, endDate?: string): void {
  if (period === 'custom') {
    if (!startDate || !endDate) {
      throw new Error("start_date dan end_date wajib diisi jika period=custom");
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Format tanggal tidak valid. Gunakan format YYYY-MM-DD");
    }
    if (start > end) {
      throw new Error("start_date tidak boleh lebih besar dari end_date");
    }
  }
}

export function validateLimit(limit?: number, defaultLimit: number = 10, max: number = 50): number {
  if (limit === undefined || limit === null) return defaultLimit;
  const num = Number(limit);
  if (isNaN(num) || num <= 0) return defaultLimit;
  return Math.min(num, max);
}

export function validateNumber(value: any, defaultValue: number): number {
  if (value === undefined || value === null) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}
