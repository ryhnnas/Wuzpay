import { Hono } from "npm:hono";
import { TOOL_DECLARATIONS, executeTool } from "../lib/ai_tools.ts";
import { Ingredient } from "../models/Ingredient.ts";

const ai = new Hono();

// ==================== OCR ASYNC QUEUE (SEMAPHORE) ====================
// Berfungsi menahan request OCR agar berjalan SATU-PERSATU, menghindari server Python OOM
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
    // Picu antrean jika sedang nganggur
    processOcrQueue();
  });
}

// ==================== SYSTEM INSTRUCTION ====================
function getSystemInstruction() {
  const t = new Date();
  const dayName = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][t.getDay()];
  const dateStr = t.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
  
  return `Kamu adalah WuzPay AI Assistant, asisten cerdas untuk sistem POS (Point of Sale) bernama WuzPay.
Konteks Waktu Saat Ini: ${dayName}, ${dateStr}

ATURAN:
1. Jawab dalam Bahasa Indonesia yang natural dan singkat
2. Gunakan tools/function yang tersedia untuk mengambil data dari database sebelum menjawab
3. Jangan pernah mengarang data — selalu ambil dari tools
4. Berikan insight yang actionable dan relevan
5. Format angka rupiah dengan "Rp" dan pemisah titik (contoh: Rp 1.500.000)
6. Jika data kosong, beritahu user dengan jujur
7. Jika diminta saran, berikan rekomendasi berdasarkan data aktual
8. Untuk pertanyaan bulan/tanggal tertentu atau hari spesifik (seperti "kemarin"), gunakan period="custom" dengan start_date dan end_date (YYYY-MM-DD) yang sesuai dengan Konteks Waktu Saat Ini.`;
}

// ==================== GROQ TOOL FORMAT ====================
// Konversi dari Gemini format ke OpenAI/Groq format
// Gemini pakai "STRING", "INTEGER", "OBJECT" → OpenAI pakai "string", "integer", "object"
function convertProps(props: any): any {
  if (!props || typeof props !== 'object') return props;
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

// ==================== GROQ API CALL ====================
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
    
    // Fallback khusus untuk Groq Tool Use Error
    // Kadang Llama 3 miss 1 karakter syntax (misal <function=nama{...}> lupa tutup >)
    if (data?.error?.code === "tool_use_failed" && data?.error?.failed_generation) {
      console.warn("[Groq] Recovering from tool_use_failed by parsing raw generation...");
      const raw = data.error.failed_generation;
      
      // Match pattern like: <function=get_sales_summary{"period":"today"}</function>
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

// ==================== POST /chat ====================
ai.post("/chat", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    // Fallback mode tanpa API key
    if (!GROQ_API_KEY) {
      return await handleSimulationMode(c, body);
    }

    const prompt = body.prompt || body.message || "";
    const history = Array.isArray(body.history) ? body.history : [];

    // Build messages array (OpenAI format)
    const messages: any[] = [
      { role: "system", content: getSystemInstruction() },
      ...history.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content || m.text || "",
      })),
    ];

    if (prompt) {
      messages.push({ role: "user", content: prompt });
    }

    // ======= CALL 1: Kirim ke Groq + tools =======
    console.log("[AI Chat] Call 1: Sending to Groq...");
    const call1 = await callGroq(messages, true);

    const choice = call1.choices?.[0];
    const message = choice?.message;

    // Cek apakah Groq ingin memanggil tool
    if (choice?.finish_reason === "tool_calls" && message?.tool_calls?.length > 0) {
      const toolCall = message.tool_calls[0]; // ambil tool pertama
      const fnName = toolCall.function.name;
      let fnArgs: any = {};

      try {
        fnArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        fnArgs = {};
      }

      console.log(`[AI Chat] Groq wants to call: ${fnName}(${JSON.stringify(fnArgs)})`);

      // ======= EXECUTE TOOL =======
      const toolResult = await executeTool(fnName, fnArgs);

      // ======= CALL 2: Kirim hasil tool → Groq susun jawaban =======
      console.log("[AI Chat] Call 2: Sending tool result to Groq...");
      const call2Messages = [
        ...messages,
        // Response model (dengan tool_calls)
        {
          role: "assistant",
          content: message.content || null,
          tool_calls: message.tool_calls,
        },
        // Hasil tool
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        },
      ];

      const call2 = await callGroq(call2Messages, false); // call 2 tanpa tools
      const finalText = call2.choices?.[0]?.message?.content || "";

      console.log("[AI Chat] Success! 2-call flow completed.");
      return c.json({ response: finalText || formatFallbackResponse(fnName, toolResult) });
    }

    // Groq langsung jawab teks (pertanyaan umum)
    const directText = message?.content || "";
    console.log("[AI Chat] Groq answered directly without tool call.");
    return c.json({ response: directText || "Maaf, AI sedang tidak bisa merespon." });

  } catch (err: any) {
    console.error("[AI Chat] Error:", err);
    return c.json({ response: `Maaf, terjadi kesalahan: ${err.message}` });
  }
});

// ==================== SIMULATION MODE ====================
async function handleSimulationMode(c: any, body: any) {
  const prompt = (body.prompt || body.message || "").toLowerCase();

  try {
    let responseText = "";

    if (prompt.match(/laris|terjual|top|best|produk.*paling/)) {
      const r = await executeTool("get_top_products", { period: "month", limit: 5 });
      responseText = formatFallbackResponse("get_top_products", r);
    } else if (prompt.match(/stok|habis|kritis|sisa|restock|bahan/)) {
      const r = await executeTool("get_low_stock_ingredients", { threshold: 10 });
      responseText = formatFallbackResponse("get_low_stock_ingredients", r);
    } else if (prompt.match(/omzet|penjualan|revenue|pendapatan|hari ini/)) {
      const r = await executeTool("get_sales_summary", { period: "today" });
      responseText = formatFallbackResponse("get_sales_summary", r);
    } else if (prompt.match(/profit|laba|untung|margin/)) {
      const r = await executeTool("get_profit_report", { period: "month" });
      responseText = formatFallbackResponse("get_profit_report", r);
    } else {
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

    return c.json({ response: responseText });
  } catch (err) {
    return c.json({ response: "Mode simulasi: Gagal mengambil data dari database." });
  }
}

// ==================== FALLBACK FORMATTER ====================
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

// ==================== GET /insights ====================
ai.get("/insights", async (c) => {
  const lowStock = await Ingredient.countDocuments({ stock_quantity: { $lt: 10 } });
  return c.json([
    { id: "1", type: "trend", title: "Insight Bisnis", description: "Gunakan fitur chat AI untuk menganalisa penjualanmu.", action: "Chat Sekarang" },
    { id: "2", type: "warning", title: "Bahan Baku Kritis", description: `Ada ${lowStock} bahan baku yang stoknya rendah.`, action: "Cek Stok" },
  ]);
});

// ==================== SCAN RECEIPT ====================
ai.post("/process-receipt", async (c) => {
  return c.json({ error: "Gunakan /scan-receipt-ocr atau /scan-receipt-vision" }, 410);
});

ai.post("/scan-receipt-ocr", async (c) => {
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
  } catch (err: any) {
    return c.json({ error: "Gagal memproses nota via OCR" }, 500);
  }
});

ai.post("/scan-receipt-vision", async (c) => {
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
          { role: "user", content: [{ type: "text", text: "Ekstrak data dari resit:" }, { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } }] },
        ],
      }),
    });

    if (!res.ok) return c.json({ error: "Gagal memproses gambar" }, 502);
    const result = await res.json();
    let parsed;
    try { parsed = JSON.parse(result.choices?.[0]?.message?.content); } catch { parsed = { tanggal: null, total_belanja: null, items: [] }; }
    return c.json({ success: true, data: parsed });
  } catch (err: any) {
    return c.json({ error: "Gagal memproses nota via Vision" }, 500);
  }
});

export default ai;