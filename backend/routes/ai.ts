import { Hono } from "npm:hono";
import { TOOL_DECLARATIONS, executeTool } from "../lib/ai_tools.ts";
import { Ingredient } from "../models/Ingredient.ts";
import { verifyAuth } from "../middleware/auth.ts";

const ai = new Hono();

const MAX_PROMPT_LENGTH = 2000;
const MAX_AGENT_STEPS = 4;

type StageHandler = (stage: "analyzing" | "fetching_data" | "composing_answer", message?: string) => void;

// ==================== OCR ASYNC QUEUE (SEMAPHORE) ====================
const ocrQueue: (() => Promise<void>)[] = [];
let isProcessingOCR = false;

async function processOcrQueue() {
  if (isProcessingOCR || ocrQueue.length === 0) return;
  isProcessingOCR = true;
  while (ocrQueue.length > 0) {
    const job = ocrQueue.shift();
    if (job) {
      try { await job(); }
      catch (err) { console.error("OCR Queue Error:", err); }
    }
  }
  isProcessingOCR = false;
}

function enqueueOcrTask<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    ocrQueue.push(async () => {
      try {
        const result = await task();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    processOcrQueue();
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requireAuth(c: any): Promise<{ ok: true; user: any } | { ok: false; response: Response }> {
  const authHeader = c.req.header("Authorization") || null;
  const sessionId = c.req.header("X-Session-ID") || null;
  const authResult = await verifyAuth(authHeader, sessionId);
  if (authResult.error || !authResult.user) {
    return { ok: false, response: c.json({ error: authResult.error || "Unauthorized" }, authResult.status || 401) };
  }
  return { ok: true, user: authResult.user };
}

function sanitizePrompt(input: string) {
  return String(input || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PROMPT_LENGTH);
}

function getSystemInstruction() {
  const now = new Date();
  const dayName = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][now.getDay()];
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return `Kamu adalah WuzPay AI Assistant, konsultan operasional dan pertumbuhan bisnis F&B untuk sistem POS WuzPay.
Konteks waktu saat ini: ${dayName}, ${dateStr}.

ATURAN WAJIB:
1. Selalu jawab dalam Bahasa Indonesia yang natural, ringkas, dan profesional.
2. Untuk pertanyaan berbasis data, prioritaskan panggil tools yang tersedia sebelum menyimpulkan.
3. Dilarang mengarang data. Jika data kosong, jujur dan jelaskan keterbatasannya.
4. Sajikan jawaban dalam struktur jelas:
   - Ringkasan singkat
   - Temuan utama (bullet points)
   - Rekomendasi aksi praktis
5. Angka uang wajib format Rupiah: "Rp 1.500.000".
6. Jika ada anomali (penurunan tajam, margin rendah, stok kritis), sorot secara proaktif.
7. Untuk pertanyaan tanggal spesifik (misal "kemarin", "bulan lalu"), gunakan period="custom" atau tool perbandingan agar range akurat.
8. Jika data hasil tool menunjukkan 0 transaksi, jangan langsung asumsi toko tutup; sarankan validasi periode/filter.
9. Berikan jawaban tegas dan actionable, hindari paragraf panjang.

CONTOH GAYA JAWABAN:
- "Omzet minggu ini Rp X, naik Y% dibanding minggu lalu."
- "Fokus aksi: 1) Restock item A, 2) Dorong promo jam sepi 14:00-16:00."
- "Data belum cukup untuk simpulan final, coba perluas periode 30 hari."`;
}

function convertProps(props: any): any {
  if (!props || typeof props !== "object") return props;
  const result: any = {};
  for (const [key, val] of Object.entries(props as Record<string, any>)) {
    const converted: any = { ...val };
    if (converted.type) converted.type = converted.type.toLowerCase();
    if (converted.properties) converted.properties = convertProps(converted.properties);
    result[key] = converted;
  }
  return result;
}

function buildGroqTools() {
  const geminiDecls = (TOOL_DECLARATIONS[0] as any).functionDeclarations;
  return geminiDecls.map((fn: any) => ({
    type: "function",
    function: {
      name: fn.name,
      description: fn.description,
      parameters: {
        type: "object",
        properties: convertProps(fn.parameters?.properties || {}),
        required: fn.parameters?.required || [],
      },
    },
  }));
}

const GROQ_TOOLS = buildGroqTools();

async function callGroq(messages: any[], useTools = true): Promise<any> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  const GROQ_API_URL = Deno.env.get("GROQ_API_URL") || "https://api.groq.com/openai/v1";
  const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

  const body: any = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 1024,
  };

  if (useTools) {
    body.tools = GROQ_TOOLS;
    body.tool_choice = "auto";
  }

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[Groq] Error:", JSON.stringify(data));
    if (data?.error?.code === "tool_use_failed" && data?.error?.failed_generation) {
      const raw = data.error.failed_generation;
      const match = raw.match(/<function=([a-zA-Z0-9_]+)>?(.*?)<\/function>/);
      if (match) {
        const fnName = match[1];
        const fnArgs = match[2];
        return {
          choices: [{
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: `call_${Date.now()}`,
                type: "function",
                function: { name: fnName, arguments: fnArgs }
              }]
            }
          }]
        };
      }
    }
    throw new Error(data?.error?.message || "Groq API error");
  }

  return data;
}

function generateSuggestedQuestions(prompt: string, usedTools: string[]) {
  const lower = prompt.toLowerCase();
  const byTools: Record<string, string[]> = {
    get_sales_summary: [
      "Bandingkan omzet minggu ini dengan minggu lalu",
      "Produk apa paling berkontribusi ke omzet?",
      "Ada jam ramai tertentu hari ini?"
    ],
    get_top_products: [
      "Produk paling sepi bulan ini apa saja?",
      "Perlu promo untuk produk ranking bawah?",
      "Bandingkan top products minggu vs bulan"
    ],
    get_low_stock_ingredients: [
      "Prediksi bahan yang habis 3 hari ke depan",
      "Prioritas restock berdasarkan produk terlaris",
      "Bahan mana paling sering dipakai?"
    ],
    compare_periods: [
      "Apa penyebab perubahan performa ini?",
      "Strategi agar periode berikutnya naik 10%",
      "Bandingkan juga profit, bukan cuma omzet"
    ],
    search_transactions: [
      "Cari transaksi dengan diskon terbesar",
      "Filter transaksi metode QRIS minggu ini",
      "Daftar customer dengan transaksi tertinggi"
    ],
  };

  for (const tool of usedTools) {
    if (byTools[tool]) return byTools[tool];
  }

  if (lower.includes("stok")) {
    return [
      "Bahan mana yang paling urgent untuk restock?",
      "Bagaimana dampak stok kritis ke penjualan?",
      "Rekomendasi stok aman untuk 7 hari ke depan"
    ];
  }

  return [
    "Bandingkan performa minggu ini dengan minggu lalu",
    "Apa 3 aksi prioritas untuk meningkatkan profit?",
    "Ada anomali atau risiko yang harus saya perhatikan?"
  ];
}

async function runSimulationMode(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();
  let responseText = "";
  const usedTools: string[] = [];

  if (lowerPrompt.match(/laris|terjual|top|best|produk.*paling/)) {
    usedTools.push("get_top_products");
    const r = await executeTool("get_top_products", { period: "month", limit: 5 });
    responseText = formatFallbackResponse("get_top_products", r);
  } else if (lowerPrompt.match(/stok|habis|kritis|sisa|restock|bahan/)) {
    usedTools.push("get_low_stock_ingredients");
    const r = await executeTool("get_low_stock_ingredients", { threshold: 10 });
    responseText = formatFallbackResponse("get_low_stock_ingredients", r);
  } else if (lowerPrompt.match(/omzet|penjualan|revenue|pendapatan|hari ini/)) {
    usedTools.push("get_sales_summary");
    const r = await executeTool("get_sales_summary", { period: "today" });
    responseText = formatFallbackResponse("get_sales_summary", r);
  } else if (lowerPrompt.match(/profit|laba|untung|margin/)) {
    usedTools.push("get_profit_report");
    const r = await executeTool("get_profit_report", { period: "month" });
    responseText = formatFallbackResponse("get_profit_report", r);
  } else {
    usedTools.push("get_sales_summary", "get_low_stock_ingredients");
    const sales = await executeTool("get_sales_summary", { period: "today" });
    const lowStock = await executeTool("get_low_stock_ingredients", { threshold: 10 });
    responseText = `📊 Ringkasan Hari Ini (Mode Tanpa API Key)\n\n`;
    responseText += `💰 Penjualan: ${sales.total_revenue_formatted} dari ${sales.transaction_count} transaksi\n`;
    responseText += `📈 Profit: ${sales.total_profit_formatted}\n`;
    if (lowStock.count > 0) {
      responseText += `\n⚠️ ${lowStock.count} bahan baku stok rendah:\n`;
      lowStock.ingredients.forEach((i: any) => {
        responseText += `  • ${i.name}: ${i.stock_remaining} ${i.unit} (${i.status})\n`;
      });
    }
    responseText += `\n💡 Atur GROQ_API_KEY di backend/.env untuk AI yang lebih cerdas.`;
  }

  return { response: responseText, usedTools };
}

async function executeAgentFlow(params: {
  prompt: string;
  history: any[];
  onStage?: StageHandler;
}) {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  const prompt = sanitizePrompt(params.prompt);
  const history = Array.isArray(params.history) ? params.history : [];

  if (!prompt) {
    return {
      response: "Silakan masukkan pertanyaan analisis yang ingin kamu lihat.",
      suggestedQuestions: generateSuggestedQuestions("", []),
      usedTools: [] as string[],
    };
  }

  if (!GROQ_API_KEY) {
    params.onStage?.("fetching_data", "Mode fallback tanpa LLM");
    const simulation = await runSimulationMode(prompt);
    return {
      response: simulation.response,
      suggestedQuestions: generateSuggestedQuestions(prompt, simulation.usedTools),
      usedTools: simulation.usedTools,
    };
  }

  const messages: any[] = [
    { role: "system", content: getSystemInstruction() },
    ...history.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content || m.text || "",
    })),
    { role: "user", content: prompt },
  ];

  const usedTools: string[] = [];

  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    params.onStage?.("analyzing", `Menganalisis konteks (langkah ${step + 1})`);
    const result = await callGroq(messages, true);
    const choice = result.choices?.[0];
    const message = choice?.message;
    const toolCalls = message?.tool_calls || [];

    if (choice?.finish_reason === "tool_calls" && toolCalls.length > 0) {
      params.onStage?.("fetching_data", `Mengambil data dari ${toolCalls.length} tool`);
      messages.push({
        role: "assistant",
        content: message?.content || null,
        tool_calls: toolCalls,
      });

      const toolResults = await Promise.all(toolCalls.map(async (toolCall: any) => {
        let fnArgs: any = {};
        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          fnArgs = {};
        }
        const fnName = toolCall.function?.name || "unknown_tool";
        usedTools.push(fnName);
        const toolResult = await executeTool(fnName, fnArgs);
        return {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        };
      }));

      messages.push(...toolResults);
      params.onStage?.("composing_answer", "Menyusun jawaban berbasis data terbaru");
      continue;
    }

    const finalText = message?.content || "";
    if (finalText.trim()) {
      return {
        response: finalText,
        suggestedQuestions: generateSuggestedQuestions(prompt, usedTools),
        usedTools,
      };
    }
  }

  params.onStage?.("composing_answer", "Finalisasi jawaban");
  const finalAttempt = await callGroq(messages, false);
  const finalText = finalAttempt.choices?.[0]?.message?.content || "";
  return {
    response: finalText || "Maaf, saya belum bisa menyusun jawaban final saat ini. Coba ulangi dengan pertanyaan lebih spesifik.",
    suggestedQuestions: generateSuggestedQuestions(prompt, usedTools),
    usedTools,
  };
}

function formatFallbackResponse(toolName: string, data: any): string {
  if (data?.error) return `⚠️ ${data.error}`;

  switch (toolName) {
    case "get_sales_summary":
      return `📊 Penjualan (${data.period}):\n• Revenue: ${data.total_revenue_formatted}\n• Profit: ${data.total_profit_formatted}\n• Transaksi: ${data.transaction_count}\n• Rata-rata: ${data.avg_transaction_formatted}`;
    case "get_top_products":
      return `🏆 Produk (${data.period}):\n${data.products?.map((p: any) => `${p.rank}. ${p.name} — ${p.quantity_sold}x, ${p.revenue_formatted}`).join("\n")}`;
    case "get_low_stock_ingredients":
      if (data.count === 0) return "✅ Semua bahan baku stoknya aman!";
      return `⚠️ ${data.count} Bahan Baku Rendah:\n${data.ingredients.map((i: any) => `• ${i.name}: ${i.stock_remaining} ${i.unit} [${i.status}]`).join("\n")}`;
    case "get_profit_report":
      return `💰 Profit (${data.period}):\n• Revenue: ${data.summary?.total_revenue_formatted}\n• Profit: ${data.summary?.total_profit_formatted}\n• Margin: ${data.summary?.profit_margin_percent}%`;
    case "get_hourly_sales":
      return `🕐 Jam Sibuk: ${data.peak_hours?.join(", ")}`;
    default:
      return JSON.stringify(data, null, 2);
  }
}

function streamSse(c: any, run: (send: (event: string, payload: any) => void) => Promise<void>) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, payload: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };
      (async () => {
        try {
          await run(send);
        } catch (error: any) {
          send("error", { message: error?.message || "Terjadi kesalahan streaming AI." });
        } finally {
          controller.close();
        }
      })();
    }
  });

  return c.newResponse(stream, 200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
}

// ==================== POST /chat ====================
ai.post("/chat", async (c) => {
  const auth = await requireAuth(c);
  if (!auth.ok) return auth.response;

  const body = await c.req.json().catch(() => ({}));
  const promptRaw = body.prompt || body.message || "";
  const prompt = sanitizePrompt(promptRaw);
  const history = Array.isArray(body.history) ? body.history : [];
  const wantsStream = Boolean(body.stream) || String(c.req.header("accept") || "").includes("text/event-stream");

  if (!prompt) {
    if (wantsStream) {
      return streamSse(c, async (send) => {
        send("done", {
          response: "Silakan masukkan pertanyaan analisis yang ingin kamu lihat.",
          suggested_questions: generateSuggestedQuestions("", []),
        });
      });
    }
    return c.json({
      response: "Silakan masukkan pertanyaan analisis yang ingin kamu lihat.",
      suggested_questions: generateSuggestedQuestions("", []),
    });
  }

  if (promptRaw.length > MAX_PROMPT_LENGTH) {
    const warning = `Pertanyaan terlalu panjang. Maksimal ${MAX_PROMPT_LENGTH} karakter agar analisis tetap akurat.`;
    if (wantsStream) {
      return streamSse(c, async (send) => send("error", { message: warning }));
    }
    return c.json({ response: warning }, 400);
  }

  if (wantsStream) {
    return streamSse(c, async (send) => {
      const flow = await executeAgentFlow({
        prompt,
        history,
        onStage: (stage, message) => send("stage", { stage, message }),
      });

      const words = flow.response.split(/(\s+)/);
      for (const token of words) {
        if (!token) continue;
        send("chunk", { text: token });
        await sleep(8);
      }

      send("done", {
        response: flow.response,
        suggested_questions: flow.suggestedQuestions,
      });
    });
  }

  try {
    const flow = await executeAgentFlow({ prompt, history });
    return c.json({
      response: flow.response,
      suggested_questions: flow.suggestedQuestions,
    });
  } catch (err: any) {
    console.error("[AI Chat] Error:", err);
    return c.json({ response: `Maaf, terjadi kesalahan: ${err.message}` });
  }
});

// ==================== GET /insights ====================
ai.get("/insights", async (c) => {
  const auth = await requireAuth(c);
  if (!auth.ok) return auth.response;

  const lowStock = await Ingredient.countDocuments({ stock_quantity: { $lt: 10 } });
  return c.json([
    { id: "1", type: "trend", title: "Insight Bisnis", description: "Gunakan fitur chat AI untuk menganalisa penjualanmu.", action: "Chat Sekarang" },
    { id: "2", type: "warning", title: "Bahan Baku Kritis", description: `Ada ${lowStock} bahan baku yang stoknya rendah.`, action: "Cek Stok" },
  ]);
});

// ==================== SCAN RECEIPT ====================
ai.post("/process-receipt", async (c) => {
  const auth = await requireAuth(c);
  if (!auth.ok) return auth.response;
  return c.json({ error: "Gunakan /scan-receipt-ocr atau /scan-receipt-vision" }, 410);
});

ai.post("/scan-receipt-ocr", async (c) => {
  const auth = await requireAuth(c);
  if (!auth.ok) return auth.response;

  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file) return c.json({ error: "File nota wajib diunggah" }, 400);

    const OCR_SERVICE_URL = Deno.env.get("OCR_SERVICE_URL") || "http://localhost:8001";
    const formData = new FormData();
    if (file instanceof File) {
      formData.append("file", file);
    } else {
      return c.json({ error: "Format file tidak valid" }, 400);
    }

    const ocrResponse = await enqueueOcrTask(() =>
      fetch(`${OCR_SERVICE_URL}/upload-resit/`, { method: "POST", body: formData })
    );

    if (!ocrResponse.ok) {
      return c.json({ error: "Gagal memproses gambar di OCR service" }, 502);
    }
    return c.json(await ocrResponse.json());
  } catch {
    return c.json({ error: "Gagal memproses nota via OCR" }, 500);
  }
});

ai.post("/scan-receipt-vision", async (c) => {
  const auth = await requireAuth(c);
  if (!auth.ok) return auth.response;

  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file) return c.json({ error: "File nota wajib diunggah" }, 400);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_API_URL = Deno.env.get("OPENAI_API_URL") || "https://api.groq.com/openai/v1";
    if (!OPENAI_API_KEY) return c.json({ error: "OPENAI_API_KEY belum dikonfigurasi" }, 500);

    let fileBuffer: ArrayBuffer;
    let mimeType = "image/png";
    if (file instanceof File) {
      fileBuffer = await file.arrayBuffer();
      mimeType = file.type || "image/png";
    } else {
      return c.json({ error: "Format file tidak valid" }, 400);
    }

    const b64 = btoa(new Uint8Array(fileBuffer).reduce((d, b) => d + String.fromCharCode(b), ""));
    const SYSTEM_PROMPT = `Anda adalah mesin ekstraksi data resit yang presisi. Balas HANYA dengan JSON murni tanpa markdown. Format:
{"tanggal":"YYYY-MM-DD atau null","total_belanja":integer atau null,"items":[{"nama_barang":"string","kuantitas":integer atau null,"harga_per_barang":integer atau null}]}`;

    const res = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Ekstrak data dari resit:" },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } }
            ]
          },
        ],
      }),
    });

    if (!res.ok) return c.json({ error: "Gagal memproses gambar" }, 502);
    const result = await res.json();
    let parsed;
    try {
      parsed = JSON.parse(result.choices?.[0]?.message?.content);
    } catch {
      parsed = { tanggal: null, total_belanja: null, items: [] };
    }
    return c.json({ success: true, data: parsed });
  } catch {
    return c.json({ error: "Gagal memproses nota via Vision" }, 500);
  }
});

export default ai;