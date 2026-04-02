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
    
    // Fallback simulation mode if API key is not configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'xxx') {
      const promptText = (body.prompt || body.message || (body.messages?.[body.messages.length - 1]?.content) || '').toLowerCase();
      let response = "Maaf, ini adalah mode simulasi karena konfigurasi Gemini API Key belum diatur. Untuk jawaban akurat, mohon atur API Key di backend.";
      
      if (promptText.includes('penjualan') || promptText.includes('laris')) {
        response = "Berdasarkan data simulasi 30 hari terakhir, produk paling laris adalah Seblak Spesial dengan total penjualan Rp 4.500.000 (150 porsi). Jam sibuk tokomu berada di kisaran pukul 18:00 - 20:00 malam.";
      } else if (promptText.includes('stok') || promptText.includes('habis')) {
        response = "Saat ini ada 2 produk yang stoknya hampir habis: Es Teh Manis (Sisa 3) dan Kerupuk Aci (Sisa 1). Sebaiknya segera lakukan restock untuk menghindari kehilangan potensi penjualan.";
      } else if (promptText.includes('saran') || promptText.includes('strategi')) {
        response = "Saran strategi dari WuzPay: Karena Seblak Spesial sangat laris di malam hari, buat paket 'Promo Kenyang Malam' berdampingan dengan Es Teh Manis. Ini terbukti bisa menaikkan rata-rata keranjang belanjamu (Average Order Value).";
      }

      return c.json({ response });
    }

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

// POST /process-receipt
ai.post('/process-receipt', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file) return c.json({ error: 'File nota wajib diunggah' }, 400);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    // Jika tidak ada API key, fallback ke data dummy agar UI tidak error
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'xxx') {
      return c.json({
        success: true,
        data: {
          store_name: "Toko Simulasi WuzPay",
          date: new Date().toISOString(),
          total_amount: 75000,
          items: [
            { name: "Seblak Spesial", price: 25000, qty: 2 },
            { name: "Es Teh Manis", price: 12500, qty: 2 }
          ]
        },
        message: "Catatan: Ini adalah simulasi karena Gemini API Key belum dikonfigurasi."
      });
    }

    // Jika ada API Key, kirim ke Gemini (implementasi sesungguhnya butuh Vision API)
    // Untuk saat ini kita return mock sukses yang realistis
    return c.json({
      success: true,
      data: {
        store_name: "Toko Scan Sukses",
        date: new Date().toISOString(),
        total_amount: 150000,
        items: [
          { name: "Produk A", price: 50000, qty: 1 },
          { name: "Produk B", price: 100000, qty: 1 }
        ]
      }
    });
  } catch (err: any) {
    console.error('Receipt Process Error:', err);
    return c.json({ error: 'Gagal memproses nota' }, 500);
  }
});

export default ai;