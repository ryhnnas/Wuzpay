import { Hono } from "npm:hono";
import { getSupabase } from "../supabaseClient.ts";
import { verifyAuth } from "../middleware/auth.ts";

const analytics = new Hono();

// ==================== REPORTS ====================

analytics.get("/reports/sales", async (c) => {
  try {
    // FIX: Ambil header Authorization dan X-Session-ID
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    
    // FIX: Masukkan sessionId ke verifyAuth
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    // FIX: Inisialisasi DB Fresh
    const db = getSupabase();
    
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    let query = db.from('transactions').select('total_amount, created_at');
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }

    const { data: transactions, error } = await query;
    if (error) throw error;
    
    const salesByDate: any = {};
    (transactions || []).forEach((t: any) => {
      const date = t.created_at.split('T')[0];
      if (!salesByDate[date]) {
        salesByDate[date] = { date, transactions: 0, revenue: 0 };
      }
      salesByDate[date].transactions++;
      salesByDate[date].revenue += Number(t.total_amount) || 0;
    });
    
    const report = Object.values(salesByDate).map((item: any) => ({
      ...item,
      avgTransaction: item.transactions > 0 ? item.revenue / item.transactions : 0,
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));
    
    return c.json({ report });
  } catch (error) {
    console.error('Sales Report Error:', error);
    return c.json({ error: 'Failed to generate sales report' }, 500);
  }
});

// Laporan Produk Terlaris
analytics.get("/reports/products", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();

    const { data, error } = await db
      .from('transaction_items')
      .select(`
        quantity,
        price_at_sale,
        products (name)
      `);

    if (error) throw error;

    const productSales: any = {};
    (data || []).forEach((item: any) => {
      const name = item.products?.name || 'Unknown Product';
      if (!productSales[name]) {
        productSales[name] = { name, quantitySold: 0, revenue: 0 };
      }
      productSales[name].quantitySold += item.quantity;
      productSales[name].revenue += (item.quantity * item.price_at_sale);
    });

    const report = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue);
    
    return c.json({ report });
  } catch (error) {
    return c.json({ error: 'Failed to generate products report' }, 500);
  }
});

analytics.get("/reports/summary", async (c) => {
  try {
    const db = getSupabase();
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // 1. Ambil nilai setelah diskon, sebelum diskon, profit, dan diskon
    let query = db.from('transactions')
      .select('total_amount, total_real_amount, profit, discount_amount, created_at');

    if (startDate && endDate) {
      const endOfDay = endDate.split('T')[0] + 'T23:59:59.999Z';
      query = query.gte('created_at', startDate).lte('created_at', endOfDay);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 2. Hitung ringkasan numerik
    const summary = (data || []).reduce((acc, curr) => {
      const revenue = Number(curr.total_amount) || 0;
      const grossRevenue = Number(curr.total_real_amount ?? curr.total_amount) || 0;
      const profit = Number(curr.profit) || 0;
      const discount = Number(curr.discount_amount) || 0;

      acc.totalRevenue += revenue;
      acc.totalGrossRevenue += grossRevenue;
      acc.totalProfit += profit;
      acc.totalDiscount += discount;
      
      return acc;
    }, { totalRevenue: 0, totalGrossRevenue: 0, totalProfit: 0, totalDiscount: 0 });

    // 3. Finalisasi (pembulatan)
    const finalSummary = {
      totalGrossRevenue: Math.round(summary.totalGrossRevenue),
      totalRevenue: Math.round(summary.totalRevenue),
      totalProfit: Math.round(summary.totalProfit),
      totalDiscount: Math.round(summary.totalDiscount)
    };

    // Log untuk audit di terminal Deno
    console.log(`✅ [Summary] Berhasil Sinkronisasi:`);
    console.log(`   - Data: ${data?.length} baris`);
    console.log(`   - Omzet Bruto: Rp ${finalSummary.totalGrossRevenue.toLocaleString('id-ID')}`);
    console.log(`   - Omzet Neto: Rp ${finalSummary.totalRevenue.toLocaleString('id-ID')}`);
    console.log(`   - Total Diskon: Rp ${finalSummary.totalDiscount.toLocaleString('id-ID')}`);
    console.log(`   - Total Profit: Rp ${finalSummary.totalProfit.toLocaleString('id-ID')}`);

    return c.json({ 
      success: true, 
      data: finalSummary 
    });
  } catch (error: any) {
    console.error('Summary Error:', error.message);
    return c.json({ error: 'Server Error' }, 500);
  }
});

analytics.get("/reports/product-sales", async (c) => {
  try {
    const db = getSupabase();
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    let query = db
      .from('transactions')
      .select(`
        created_at,
        transaction_items (
          quantity,
          price_at_sale,
          cost_at_sale,
          products ( name )
        )
      `);

    if (startDate && endDate) {
      const endOfDay = endDate.split('T')[0] + 'T23:59:59.999Z';
      query = query.gte('created_at', startDate).lte('created_at', endOfDay);
    }

    const { data, error } = await query;
    if (error) throw error;

    const stats: Record<string, any> = {};
    
    // Proses hitung per item
    if (data) {
      data.forEach((transaction: any) => {
        if (transaction.transaction_items && Array.isArray(transaction.transaction_items)) {
          transaction.transaction_items.forEach((item: any) => {
            const name = item.products?.name || 'Produk Tidak Diketahui';
            const cost = Number(item.cost_at_sale) || 0;
            const price = Number(item.price_at_sale) || 0;
            const qty = Number(item.quantity) || 0;

            if (!stats[name]) {
              stats[name] = { name, qty: 0, revenue: 0, profit: 0 };
            }

            stats[name].qty += qty;
            stats[name].revenue += (qty * price);
            stats[name].profit += ((qty * price) - (cost * qty));
          });
        }
      });
    }

    // TAHAP FINAL: Mapping ke Array + Pembulatan per baris produk
    const finalData = Object.values(stats).map((item: any) => ({
      name: item.name,
      qty: item.qty,
      revenue: Math.round(item.revenue),
      profit: Math.round(item.profit)
    })).sort((a: any, b: any) => b.revenue - a.revenue);

    console.log(`📦 [Product Sales] ${data?.length} transaksi diproses.`);

    return c.json({ 
      data: finalData 
    });

  } catch (error: any) {
    console.error('Product Sales Error:', error.message);
    return c.json({ error: 'Server Error' }, 500);
  }
});

analytics.get("/reports/category-sales", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    let query = db
      .from('transactions')
      .select(`
        created_at,
        transaction_items (
          quantity,
          price_at_sale,
          cost_at_sale,
          total_amount,
          category_name,
          products (
            categories ( name )
          )
        )
      `);

    if (startDate && endDate) {
      const endOfDay = endDate.split('T')[0] + 'T23:59:59.999Z';
      query = query.gte('created_at', startDate).lte('created_at', endOfDay);
    }

    const { data, error } = await query;
    if (error) throw error;

    const grouped: Record<string, { category: string; qty: number; revenue: number; profit: number }> = {};

    (data || []).forEach((transaction: any) => {
      if (!Array.isArray(transaction.transaction_items)) return;

      transaction.transaction_items.forEach((item: any) => {
        const category = item.category_name || item.products?.categories?.name || 'Tanpa Kategori';
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price_at_sale) || 0;
        const cost = Number(item.cost_at_sale) || 0;
        const revenue = Number(item.total_amount) || (qty * price);
        const profit = revenue - (qty * cost);

        if (!grouped[category]) {
          grouped[category] = { category, qty: 0, revenue: 0, profit: 0 };
        }

        grouped[category].qty += qty;
        grouped[category].revenue += revenue;
        grouped[category].profit += profit;
      });
    });

    return c.json({
      data: Object.values(grouped).sort((a, b) => b.revenue - a.revenue)
    });
  } catch (error: any) {
    console.error('Category Sales Report Error:', error?.message || error);
    return c.json({ error: 'Gagal memuat laporan penjualan per kategori' }, 500);
  }
});

analytics.get("/reports/qris", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const db = getSupabase();
    
    // 1. Ambil parameter dari URL
    const limit = Number(c.req.query('limit')) || 10;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // 2. Inisialisasi query tanpa 'await' di depan
    let query = db
      .from('transactions')
      .select(`
        id,
        total_amount,
        created_at,
        status,
        payment_method,
        reference_id,
        customers (name)
      `)
      .in('payment_method', ['qris', 'gopay'])
      .order('created_at', { ascending: false })
      .limit(limit);

    // 3. Tambahkan filter tanggal jika ada
    if (startDate && endDate) {
      // Pastikan endDate mencakup sampai detik terakhir hari tersebut
      const endOfDay = endDate.split('T')[0] + 'T23:59:59.999Z';
      query = query.gte('created_at', startDate).lte('created_at', endOfDay);
    }

    // 4. Baru jalankan query-nya dengan 'await'
    const { data: qrisTransactions, error } = await query;

    if (error) throw error;
    
    return c.json({ data: qrisTransactions || [] });
  } catch (error) {
    console.error('QRIS Report Error:', error);
    return c.json({ error: 'Gagal memuat laporan QRIS' }, 500);
  }
});

// ==================== AI ENDPOINTS ====================

analytics.post("/ai/chat", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error } = await verifyAuth(authHeader, sessionId);
    if (error) return c.json({ error }, 401);
    
    const { message } = await c.req.json();
    const response = `Mock AI Response untuk: "${message}". Silakan integrasikan dengan Gemini AI.`;
    return c.json({ response });
  } catch (error) {
    return c.json({ error: 'Failed to process AI chat' }, 500);
  }
});

analytics.get("/ai/insights", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);
    
    const db = getSupabase();

    // 1. Cek Stok Menipis
    const { data: lowStock } = await db
      .from('products')
      .select('name, stock_quantity')
      .lt('stock_quantity', 10);

    const insights = [];
    if (lowStock && lowStock.length > 0) {
      insights.push({
        id: 'insight-stock',
        type: 'warning',
        title: 'Stok Produk Menipis',
        description: `${lowStock.length} produk (termasuk ${lowStock[0].name}) butuh restok segera.`,
        date: new Date().toISOString(),
      });
    }
    
    // 2. Ringkasan Hari Ini
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTrans } = await db
      .from('transactions')
      .select('total_amount')
      .gte('created_at', today);

    if (todayTrans && todayTrans.length > 0) {
      const totalRev = todayTrans.reduce((sum, t) => sum + Number(t.total_amount), 0);
      insights.push({
        id: 'insight-sales',
        type: 'trend',
        title: 'Performa Hari Ini',
        description: `Hari ini sudah ada ${todayTrans.length} transaksi dengan total omzet ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalRev)}.`,
        date: new Date().toISOString(),
      });
    }
    
    return c.json({ insights });
  } catch (error) {
    return c.json({ error: 'Failed to generate insights' }, 500);
  }
});

export default analytics;