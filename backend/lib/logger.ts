/**
 * Utility untuk merekam jejak audit (Audit Trail) ke dalam file log permanen. 
 * Berguna untuk mendeteksi tindakan kritis seperti penghapusan, pembatalan, 
 * atau manipulasi kasir di masa mendatang.
 */

// Format timestamp standar: YYYY-MM-DD HH:mm:ss
function getFormattedTime() {
  const now = new Date();
  return now.toISOString();
}

/**
 * Merekam kejadian ke dalam file wuzpay-audit.log
 * @param action - Nama aktivitas (e.g. "CREATE_TRANSACTION", "DELETE_PRODUCT")
 * @param user - User object (minimal memiliki id/email/role)
 * @param details - Obyek detail tambahan tentang apa yang diubah
 */
export async function auditLog(action: string, user: any, details: any = {}) {
  try {
    const actor = user?.email || user?.name || user?.id || "System";
    const role = user?.role || "Unknown";
    
    const logStr = `[${getFormattedTime()}] ACTOR:${actor} (${role}) | ACTION:${action} | DETAILS:${JSON.stringify(details)}\n`;
    
    // Asynchronously append ke file di root folder backend
    await Deno.writeTextFile("./wuzpay-audit.log", logStr, { append: true });
  } catch (error) {
    // Fallsback safely jika file gagal ditulis (e.g. permission issue) agar sistem terhindar crash
    console.error("❌ Gagal menulis audit log file:", error);
  }
}
