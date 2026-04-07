import { Hono } from "npm:hono";
import { Transaction } from "../models/Transaction.ts";
import { Product } from "../models/Product.ts";
import { verifyAuth } from "../middleware/auth.ts";
import { parseDateRange, getTodayRangeWIB } from "../lib/date.ts";

const analytics = new Hono();

// ==================== REPORTS: SALES BY DATE ====================
analytics.get("/reports/sales", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const filter: any = {};
    if (startDate && endDate) {
      const { start, end } = parseDateRange(startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const transactions = await Transaction.find(filter).select('total_amount createdAt');

    const salesByDate: any = {};
    transactions.forEach((t: any) => {
      const date = t.createdAt.toISOString().split('T')[0];
      if (!salesByDate[date]) {
        salesByDate[date] = { date, transactions: 0, revenue: 0 };
      }
      salesByDate[date].transactions++;
      salesByDate[date].revenue += t.total_amount;
    });

    const report = Object.values(salesByDate).map((item: any) => ({
      ...item,
      avgTransaction: item.transactions > 0 ? item.revenue / item.transactions : 0,
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));

    return c.json({ report });
  } catch (error) {
    return c.json({ error: 'Failed to generate sales report' }, 500);
  }
});

// ==================== REPORTS: SUMMARY (AGGREGATION) ====================
analytics.get("/reports/summary", async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const filter: any = {};
    if (startDate && endDate) {
      const { start, end } = parseDateRange(startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const stats = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total_amount" },
          totalGrossRevenue: { $sum: { $ifNull: ["$total_real_amount", "$total_amount"] } },
          totalProfit: { $sum: { $ifNull: ["$profit", 0] } },
          totalDiscount: { $sum: { $ifNull: ["$discount_amount", 0] } },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = stats[0] || { totalRevenue: 0, totalGrossRevenue: 0, totalProfit: 0, totalDiscount: 0 };

    const finalSummary = {
      totalGrossRevenue: Math.round(result.totalGrossRevenue),
      totalRevenue: Math.round(result.totalRevenue),
      totalProfit: Math.round(result.totalProfit),
      totalDiscount: Math.round(result.totalDiscount)
    };

    return c.json({ success: true, data: finalSummary });
  } catch (error) {
    return c.json({ error: 'Server Error' }, 500);
  }
});

// ==================== REPORTS: PRODUCT SALES ====================
analytics.get("/reports/product-sales", async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const filter: any = {};
    if (startDate && endDate) {
      const { start, end } = parseDateRange(startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const transactions = await Transaction.find(filter);
    const stats: Record<string, any> = {};

    transactions.forEach((trans: any) => {
      trans.items.forEach((item: any) => {
        const name = item.name || 'Produk Tidak Diketahui';
        if (!stats[name]) {
          stats[name] = { name, qty: 0, revenue: 0, profit: 0 };
        }
        stats[name].qty += item.quantity;
        stats[name].revenue += (item.quantity * item.price_at_sale);
        stats[name].profit += ((item.quantity * item.price_at_sale) - (item.quantity * (item.cost_at_sale || 0)));
      });
    });

    const finalData = Object.values(stats)
      .map((item: any) => ({ ...item, revenue: Math.round(item.revenue), profit: Math.round(item.profit) }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    return c.json({ data: finalData });
  } catch (error) {
    return c.json({ error: 'Server Error' }, 500);
  }
});

// ==================== AI INSIGHTS (MONGODB VERSION) ====================
analytics.get("/ai/insights", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || null;
    const sessionId = c.req.header('X-Session-ID') || null;
    const { error: authError } = await verifyAuth(authHeader, sessionId);
    if (authError) return c.json({ error: authError }, 401);

    const lowStock = await Product.find({ stock_quantity: { $lt: 10 } }).select('name stock_quantity').limit(5);

    const insights = [];
    if (lowStock.length > 0) {
      insights.push({
        id: 'insight-stock',
        type: 'warning',
        title: 'Stok Produk Menipis',
        description: `${lowStock.length} produk (termasuk ${lowStock[0].name}) butuh restok segera.`,
        date: new Date().toISOString(),
      });
    }

    const { start: todayStart, end: todayEnd } = getTodayRangeWIB();
    const todayTrans = await Transaction.find({ createdAt: { $gte: todayStart, $lte: todayEnd } });

    if (todayTrans.length > 0) {
      const totalRev = todayTrans.reduce((sum, t) => sum + t.total_amount, 0);
      insights.push({
        id: 'insight-sales',
        type: 'trend',
        title: 'Performa Hari Ini',
        description: `Hari ini sudah ada ${todayTrans.length} transaksi dengan total omzet Rp ${totalRev.toLocaleString('id-ID')}.`,
        date: new Date().toISOString(),
      });
    }

    return c.json({ insights });
  } catch (error) {
    return c.json({ error: 'Failed to generate insights' }, 500);
  }
});

// ==================== REPORTS: CATEGORY SALES ====================
analytics.get("/reports/category-sales", async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    const filter: any = {};
    if (startDate && endDate) {
      const { start, end } = parseDateRange(startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const stats = await Transaction.aggregate([
      { $match: filter },
      { $unwind: "$items" },
      {
        $group: {
          // Kalau category_name di item kosong, kita pakai ID produk buat lookup nanti
          _id: { $ifNull: ["$items.category_name", "Umum"] },
          category: { $first: { $ifNull: ["$items.category_name", "Umum"] } },
          qty: { $sum: "$items.quantity" },
          // Gunakan price_at_sale * quantity biar PASTI muncul angkanya
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price_at_sale"] } },
          profit: { $sum: { 
            $subtract: [
              { $multiply: ["$items.quantity", "$items.price_at_sale"] },
              { $multiply: ["$items.quantity", { $ifNull: ["$items.cost_at_sale", 0] }] }
            ]
          }}
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    return c.json({ success: true, data: stats });
  } catch (error) {
    return c.json({ error: 'Server Error Category' }, 500);
  }
});

// ==================== REPORTS: QRIS TRANSACTIONS (ANTI 404) ====================
analytics.get("/reports/qris", async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const limit = parseInt(c.req.query('limit') || '20');

    const filter: any = { payment_method: 'qris' }; // Kunci utama: Cuma QRIS mang!
    
    if (startDate && endDate) {
      const { start, end } = parseDateRange(startDate, endDate);
      filter.createdAt = { $gte: start, $lte: end };
    }

    // Ambil data transaksi QRIS terbaru
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    // Hitung total nominal QRIS di periode tersebut
    const summary = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$total_amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    return c.json({ 
      success: true, 
      data: transactions,
      summary: summary[0] || { totalAmount: 0, count: 0 }
    });
  } catch (error) {
    console.error("EROR LAPORAN QRIS:", error);
    return c.json({ error: 'Gagal memuat data QRIS' }, 500);
  }
});

export default analytics;