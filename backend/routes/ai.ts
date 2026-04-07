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
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const sevenDaysAgo = new Date(new Date().setDate(now.getDate() - 7));
    const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));

    // 1. Ambil Summary Penjualan (Today, Week, Month) menggunakan Aggregation
    const salesStats = await Transaction.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo, $lt: todayEnd } } },
      {
        $facet: {
          today: [{ $match: { createdAt: { $gte: todayStart, $lt: todayEnd } } }, { $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          weekly: [{ $match: { createdAt: { $gte: sevenDaysAgo, $lt: todayEnd } } }, { $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          monthly: [{ $group: { _id: null, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } }],
          dailyBreakdown: [
            { $match: { createdAt: { $gte: sevenDaysAgo, $lt: todayEnd } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Jakarta" } }, rev: { $sum: "$total_amount" }, count: { $sum: 1 } } },
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
      { $match: { createdAt: { $gte: thirtyDaysAgo, $lt: todayEnd } } },
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

    // Bawa riwayat percakapan agar AI paham konteks
    const history = Array.isArray(body.history) ? body.history : [];
    const messages = history.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      content: m.content || m.text || ''
    }));
    
    if (prompt) {
      messages.push({ role: 'user', content: prompt });
    }

    const businessContext = await fetchBusinessContext();

    const result = await callGemini(GEMINI_API_URL!, GEMINI_API_KEY, {
      messages: messages.length > 0 ? messages : undefined,
      prompt: messages.length > 0 ? undefined : prompt,
      systemInstruction: businessContext,
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

// POST /process-receipt (legacy, kept for backward compat)
ai.post('/process-receipt', async (c) => {
  return c.json({ error: 'Gunakan /scan-receipt-ocr atau /scan-receipt-vision' }, 410);
});

// ==================== SCAN RECEIPT - OCR METHOD ====================
// Proxy ke Python PaddleOCR microservice di port 8001
ai.post('/scan-receipt-ocr', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file) return c.json({ error: 'File nota wajib diunggah' }, 400);

    const OCR_SERVICE_URL = Deno.env.get('OCR_SERVICE_URL') || 'http://localhost:8001';

    // Forward file ke Python OCR service
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      return c.json({ error: 'Format file tidak valid' }, 400);
    }

    const ocrResponse = await fetch(`${OCR_SERVICE_URL}/upload-resit/`, {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
      const errText = await ocrResponse.text().catch(() => 'Unknown error');
      console.error('OCR Service Error:', errText);
      return c.json({ error: 'Gagal memproses gambar di OCR service', detail: errText }, 502);
    }

    const result = await ocrResponse.json();
    return c.json(result);
  } catch (err: any) {
    console.error('Scan Receipt OCR Error:', err);
    return c.json({ error: 'Gagal memproses nota via OCR' }, 500);
  }
});

// ==================== SCAN RECEIPT - LLM VISION METHOD ====================
// Langsung kirim gambar ke LLM vision model via OpenAI-compatible API
ai.post('/scan-receipt-vision', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file) return c.json({ error: 'File nota wajib diunggah' }, 400);

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const OPENAI_API_URL = Deno.env.get('OPENAI_API_URL') || 'https://api.groq.com/openai/v1';

    if (!OPENAI_API_KEY) {
      return c.json({ error: 'OPENAI_API_KEY belum dikonfigurasi di backend' }, 500);
    }

    // Baca file dan convert ke base64
    let fileBuffer: ArrayBuffer;
    let mimeType = 'image/png';

    if (file instanceof File) {
      fileBuffer = await file.arrayBuffer();
      mimeType = file.type || 'image/png';
    } else {
      return c.json({ error: 'Format file tidak valid' }, 400);
    }

    const b64Image = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const SYSTEM_PROMPT = `Anda adalah mesin ekstraksi data resit (struk belanja) yang sangat presisi. Tugas Anda adalah menganalisis gambar resit dan mengubahnya menjadi format JSON yang valid.

ATURAN MUTLAK:
1. Anda HANYA boleh merespons dengan JSON murni.
2. DILARANG KERAS menambahkan teks pengantar, penjelasan, atau penutup.
3. DILARANG KERAS menggunakan format markdown block (jangan gunakan \`\`\`json atau \`\`\`).
4. Jika nilai tidak ditemukan dalam teks, isi dengan null (bukan string kosong atau 0).
5. Bersihkan angka dari simbol mata uang (seperti Rp, $, .) dan kembalikan sebagai tipe data integer/number. Format tanggal usahakan menjadi YYYY-MM-DD.

STRUKTUR JSON YANG DIWAJIBKAN:
{
  "tanggal": "string (YYYY-MM-DD) atau null",
  "total_belanja": integer atau null,
  "items": [
    {
      "nama_barang": "string",
      "kuantitas": integer atau null,
      "harga_per_barang": integer atau null
    }
  ]
}`;

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Ekstrak data dari resit berikut:' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${b64Image}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error('LLM Vision API Error:', errText);
      return c.json({ error: 'Gagal memproses gambar di LLM Vision', detail: errText }, 502);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { tanggal: null, total_belanja: null, items: [] };
    }

    return c.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Scan Receipt Vision Error:', err);
    return c.json({ error: 'Gagal memproses nota via LLM Vision' }, 500);
  }
});

export default ai;