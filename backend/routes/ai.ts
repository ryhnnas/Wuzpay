import { Hono } from "npm:hono";
import { callGemini } from "../lib/gemini.ts";
import { Transaction } from "../models/Transaction.ts";
import { Product } from "../models/Product.ts";

const ai = new Hono();

// ==================== BUSINESS CONTEXT FETCHER (MONGODB VERSION) ====================
async function fetchBusinessContext(): Promise<string> {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 7));
    const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));

    // 1. Ambil Summary Penjualan (Today, Week, Month) menggunakan Aggregation
    const salesStats = await Transaction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $facet: {
          today: [{ $match: { createdAt: { $gte: todayStart } } }, { $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          weekly: [{ $match: { createdAt: { $gte: sevenDaysAgo } } }, { $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          monthly: [{ $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          dailyBreakdown: [
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } },
            { $sort: { "_id": 1 } }
          ]
        }
      }
    ]);

    const stats = salesStats[0];
    const todayRev = stats.today[0]?.rev || 0;
    const weeklyRev = stats.weekly[0]?.rev || 0;

    const dailyText = stats.dailyBreakdown
      .map((d: any) => `  ${d._id}: Rp ${d.rev.toLocaleString('id-ID')} (${d.count} transaksi)`)
      .join('\n');

    // 2. Top 10 Produk (Unwind array items di MongoDB)
    const topProductsRaw = await Transaction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          qty: { $sum: "$items.quantity" },
          rev: { $sum: "$items.total_amount" },
          profit: { $sum: { $subtract: ["$items.total_amount", { $multiply: ["$items.quantity", "$items.cost_at_sale"] }] } }
        }
      },
      { $sort: { rev: -1 } },
      { $limit: 10 }
    ]);

    const topProductsText = topProductsRaw
      .map((p: any, i: number) => `  ${i + 1}. ${p._id} — terjual ${p.qty} pcs, revenue Rp ${p.rev.toLocaleString('id-ID')}, profit Rp ${Math.round(p.profit).toLocaleString('id-ID')}`)
      .join('\n');

    // 3. Stok Kritis
    const lowStockRaw = await Product.find({ stock_quantity: { $lt: 5 } }).sort({ stock_quantity: 1 }).limit(10);
    const lowStockText = lowStockRaw.map(p => `  - ${p.name}: ${p.stock_quantity} tersisa`).join('\n') || '  (tidak ada produk kritis)';

    // 4. Semua Produk
    const allProductsRaw = await Product.find().populate('category_id', 'name').limit(50);
    const allProductsText = allProductsRaw.map(p => `  - ${p.name} (${(p.category_id as any)?.name || 'Umum'}): Rp ${p.price.toLocaleString('id-ID')}, stok ${p.stock_quantity}`).join('\n');

    const todayDateStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `Kamu adalah AI Assistant untuk sistem POS bernama WuzPay. Jawab dalam Bahasa Indonesia, singkat, dan actionable.
    
Tanggal sekarang: ${todayDateStr}

=== DATA BISNIS REAL-TIME ===
PENJUALAN HARI INI: Rp ${todayRev.toLocaleString('id-ID')} (${stats.today[0]?.count || 0} transaksi)
PENJUALAN 7 HARI TERAKHIR: Rp ${weeklyRev.toLocaleString('id-ID')}
Breakdown per hari:
${dailyText}

TOP 10 PRODUK (30 hari terakhir):
${topProductsText}

PRODUK STOK KRITIS (< 5):
${lowStockText}

DAFTAR PRODUK:
${allProductsText}

Gunakan data ini untuk memberikan saran strategi atau menjawab pertanyaan owner.`;

  } catch (err) {
    console.error('AI Context Error:', err);
    return "Kamu adalah AI Assistant WuzPay. Data saat ini tidak tersedia, beritahu user untuk mencoba lagi nanti.";
  }
}

// POST /chat
ai.post('/chat', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const GEMINI_API_URL = Deno.env.get('GEMINI_API_URL');

    if (!GEMINI_API_KEY) return c.json({ error: 'AI Key missing' }, 500);

    const prompt = body.prompt || body.message || (body.messages?.[body.messages.length - 1]?.content);

    const result = await callGemini(GEMINI_API_URL!, GEMINI_API_KEY, {
      prompt: prompt,
      systemInstruction: await fetchBusinessContext(),
    });

    // Menangani format response Gemini yang berbeda-beda
    let text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || 
               result.data?.output || 
               "Maaf, AI sedang tidak bisa merespon.";

    return c.json({ response: text });
  } catch (err) {
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /insights
ai.get('/insights', async (c) => {
  const lowStock = await Product.countDocuments({ stock_quantity: { $lt: 5 } });
  const sample = [
    { id: '1', type: 'trend', title: 'Insight Bisnis', description: 'Gunakan fitur chat AI untuk menganalisa penjualanmu.', action: 'Chat Sekarang' },
    { id: '2', type: 'warning', title: 'Stok Kritis', description: `Ada ${lowStock} produk yang hampir habis.`, action: 'Cek Stok' },
  ];
  return c.json(sample);
});

export default ai;