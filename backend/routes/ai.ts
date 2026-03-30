import { Hono } from "npm:hono";
import { callGemini } from "../lib/gemini.ts";
import { getSupabase } from "../supabaseClient.ts";

const ai = new Hono();

// ==================== BUSINESS CONTEXT FETCHER ====================
async function fetchBusinessContext(): Promise<string> {
  try {
    const db = getSupabase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      todayTxResult,
      weekTxResult,
      monthTxResult,
      topProductsResult,
      lowStockResult,
      allProductsResult,
    ] = await Promise.all([
      // Today's transactions
      db.from('transactions')
        .select('total_amount, created_at')
        .gte('created_at', todayStart),

      // Last 7 days transactions
      db.from('transactions')
        .select('total_amount, created_at')
        .gte('created_at', sevenDaysAgo),

      // Last 30 days transactions
      db.from('transactions')
        .select('total_amount, created_at')
        .gte('created_at', thirtyDaysAgo),

      // Top products this month (by revenue)
      db.from('transaction_items')
        .select(`quantity, price_at_sale, cost_at_sale, products (name)`)
        .gte('created_at' as any, thirtyDaysAgo),

      // Low stock products
      db.from('products')
        .select('name, stock_quantity, price')
        .lt('stock_quantity', 5)
        .order('stock_quantity', { ascending: true })
        .limit(10),

      // All products count + summary
      db.from('products')
        .select('name, price, stock_quantity, categories(name)'),
    ]);

    // --- Today summary ---
    const todayTx = todayTxResult.data || [];
    const todayRevenue = todayTx.reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0);
    const todayCount = todayTx.length;

    // --- Weekly summary ---
    const weekTx = weekTxResult.data || [];
    const weekRevenue = weekTx.reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0);
    const weekCount = weekTx.length;

    // --- Daily breakdown (last 7 days) ---
    const dailyMap: Record<string, { revenue: number; count: number }> = {};
    weekTx.forEach((t: any) => {
      const date = t.created_at?.split('T')[0] || '';
      if (!dailyMap[date]) dailyMap[date] = { revenue: 0, count: 0 };
      dailyMap[date].revenue += Number(t.total_amount || 0);
      dailyMap[date].count++;
    });
    const dailyBreakdown = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => `  ${date}: Rp ${v.revenue.toLocaleString('id-ID')} (${v.count} transaksi)`)
      .join('\n');

    // --- Monthly summary ---
    const monthTx = monthTxResult.data || [];
    const monthRevenue = monthTx.reduce((s: number, t: any) => s + Number(t.total_amount || 0), 0);
    const monthCount = monthTx.length;

    // --- Top products this month ---
    const productStats: Record<string, { qty: number; revenue: number; profit: number }> = {};
    (topProductsResult.data || []).forEach((item: any) => {
      const name = item.products?.name || 'Unknown';
      const qty = Number(item.quantity || 0);
      const price = Number(item.price_at_sale || 0);
      const cost = Number(item.cost_at_sale || 0);
      if (!productStats[name]) productStats[name] = { qty: 0, revenue: 0, profit: 0 };
      productStats[name].qty += qty;
      productStats[name].revenue += qty * price;
      productStats[name].profit += qty * (price - cost);
    });
    const topProducts = Object.entries(productStats)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([name, v], i) =>
        `  ${i + 1}. ${name} — terjual ${v.qty} pcs, revenue Rp ${v.revenue.toLocaleString('id-ID')}, profit Rp ${v.profit.toLocaleString('id-ID')}`
      )
      .join('\n');

    // --- Low stock ---
    const lowStock = (lowStockResult.data || [])
      .map((p: any) => `  - ${p.name}: ${p.stock_quantity} tersisa`)
      .join('\n') || '  (tidak ada produk kritis)';

    // --- All products ---
    const allProducts = (allProductsResult.data || [])
      .map((p: any) => `  - ${p.name} (${p.categories?.name || 'Tidak berkategori'}): Rp ${Number(p.price).toLocaleString('id-ID')}, stok ${p.stock_quantity}`)
      .join('\n');

    const todayDateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `Kamu adalah AI Assistant untuk sistem POS (Point of Sale) bernama Nexera POS. Jawab semua pertanyaan dalam Bahasa Indonesia kecuali diminta sebaliknya. Berikan jawaban yang singkat, jelas, dan actionable.

Tanggal sekarang: ${todayDateStr}

=== DATA BISNIS REAL-TIME ===

PENJUALAN HARI INI:
  Total transaksi: ${todayCount}
  Total pendapatan: Rp ${todayRevenue.toLocaleString('id-ID')}

PENJUALAN 7 HARI TERAKHIR:
  Total transaksi: ${weekCount}
  Total pendapatan: Rp ${weekRevenue.toLocaleString('id-ID')}
  Rata-rata per hari: Rp ${Math.round(weekRevenue / 7).toLocaleString('id-ID')}
Breakdown per hari:
${dailyBreakdown || '  (tidak ada data)'}

PENJUALAN 30 HARI TERAKHIR:
  Total transaksi: ${monthCount}
  Total pendapatan: Rp ${monthRevenue.toLocaleString('id-ID')}
  Rata-rata per hari: Rp ${Math.round(monthRevenue / 30).toLocaleString('id-ID')}

TOP 10 PRODUK TERLARIS (30 hari terakhir, berdasarkan revenue):
${topProducts || '  (tidak ada data penjualan)'}

PRODUK STOK KRITIS (stok < 5):
${lowStock}

DAFTAR SEMUA PRODUK:
${allProducts || '  (tidak ada produk)'}

Gunakan data di atas untuk menjawab pertanyaan pengguna secara akurat. Jika ditanya tentang sesuatu yang tidak ada dalam data, katakan bahwa data tersebut tidak tersedia.`;

  } catch (err) {
    console.error('Failed to fetch business context:', err);
    return `Kamu adalah AI Assistant untuk sistem POS bernama Nexera POS. Jawab pertanyaan dalam Bahasa Indonesia. Saat ini data bisnis tidak dapat diambil dari database, mohon informasikan kepada pengguna.`;
  }
}

// POST /chat
// Body: { prompt: string } or { messages: [...] }
ai.post('/chat', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));

    // Accept multiple payload shapes from frontend:
    // - { prompt }
    // - { messages }
    // - { message, history }
    if (!body.prompt && !body.messages && !body.message && !body.history) {
      return c.json({ error: 'Missing prompt/message/history in request body' }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const GEMINI_API_URL = Deno.env.get('GEMINI_API_URL');

    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      return c.json({ error: 'AI not configured. Set GEMINI_API_KEY and GEMINI_API_URL in backend .env' }, 500);
    }

    // Normalize incoming content for the helper
    const reqPayload: any = {};
    if (body.options) reqPayload.options = body.options;

    if (body.messages) {
      reqPayload.messages = body.messages;
    } else if (body.history || body.message) {
      // frontend history items: { id, role, content, timestamp }
      // Build full conversation including the new message at the end
      const historyMsgs = (body.history || []).map((h: any) => ({ role: h.role, content: h.content }));
      const newMsg = body.message || body.prompt;
      reqPayload.messages = newMsg
        ? [...historyMsgs, { role: 'user', content: newMsg }]
        : historyMsgs;
    } else if (body.prompt) {
      reqPayload.prompt = body.prompt;
    }

    const result = await callGemini(GEMINI_API_URL, GEMINI_API_KEY, {
      ...reqPayload,
      systemInstruction: await fetchBusinessContext(),
    });

    if (!result.ok) {
      return c.json({ error: 'AI service error', status: result.status, details: result.data || result.raw }, 502);
    }

    // Normalize response to simple string for the frontend chat
    const data = result.data;
    let text = '';
    if (typeof data === 'string') text = data;
    else if (Array.isArray(data)) text = data.join('\n');
    else if (data) {
      // Try common fields
      if ((data as any).choices && (data as any).choices[0]) {
        const ch = (data as any).choices[0];
        text = ch.message?.content || ch.text || JSON.stringify(ch);
      } else if ((data as any).candidates && (data as any).candidates[0]) {
        const c0 = (data as any).candidates[0];
        const contentObj = c0.content;
        if (contentObj && Array.isArray(contentObj.parts)) {
          text = contentObj.parts.map((p: any) => p.text || JSON.stringify(p)).join('');
        } else {
          text = contentObj?.text || c0.output || JSON.stringify(c0);
        }
      } else if ((data as any).output && (data as any).output[0]) {
        // Google generative: try joining text segments
        const out = (data as any).output[0];
        if (Array.isArray(out.content)) {
          text = out.content.map((p: any) => p.text || JSON.stringify(p)).join('\n');
        } else {
          text = out.content?.text || JSON.stringify(out);
        }
      } else {
        try { text = JSON.stringify(data); } catch { text = String(data); }
      }
    }

    return c.json({ response: text });
  } catch (err) {
    console.error('AI chat error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /insights
// Example: { text: "receipt text" }
ai.post('/insights', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const text = body.text || body.prompt;

    if (!text) return c.json({ error: 'Missing text for insights' }, 400);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const GEMINI_API_URL = Deno.env.get('GEMINI_API_URL');

    if (!GEMINI_API_KEY || !GEMINI_API_URL) {
      return c.json({ error: 'AI not configured. Set GEMINI_API_KEY and GEMINI_API_URL in backend .env' }, 500);
    }

    // Build a simple prompt for insights — you can customize this.
    const prompt = `Extract key insights and a short summary from the following text:\n\n${text}`;

    const result = await callGemini(GEMINI_API_URL, GEMINI_API_KEY, { prompt });

    if (!result.ok) {
      return c.json({ error: 'AI service error', status: result.status, details: result.data || result.raw }, 502);
    }

    return c.json({ insights: result.data });
  } catch (err) {
    console.error('AI insights error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /insights - frontend expects GET to fetch current insights
ai.get('/insights', async (c) => {
  // Return lightweight mock insights or cached insights if you implement caching
  const sample = [
    { id: '1', type: 'trend', title: 'Penjualan Meningkat', description: 'Penjualan naik 12% minggu ini dibanding minggu lalu', action: 'Lihat laporan' },
    { id: '2', type: 'warning', title: 'Stok Menipis', description: 'Produk X stok tersisa kurang dari 5', action: 'Tambahkan stok' },
  ];
  return c.json(sample);
});

export default ai;
