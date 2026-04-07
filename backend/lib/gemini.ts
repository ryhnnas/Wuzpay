export interface GeminiRequest {
  prompt?: string;
  messages?: unknown;
  systemInstruction?: string;
  // Function calling support
  tools?: unknown[];
  toolConfig?: unknown;
  // Any additional provider-specific options
  options?: Record<string, unknown>;
}

export interface GeminiResponse {
  status: number;
  ok: boolean;
  data: any;
  raw: string;
}

/**
 * Mengecek apakah response dari Gemini berisi function call
 */
export function extractFunctionCall(response: GeminiResponse): { name: string; args: Record<string, any> } | null {
  try {
    const parts = response.data?.candidates?.[0]?.content?.parts;
    if (!parts || !Array.isArray(parts)) return null;
    
    for (const part of parts) {
      if (part.functionCall) {
        return {
          name: part.functionCall.name,
          args: part.functionCall.args || {},
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Mengambil seluruh content model dari response (termasuk thought_signature).
 * PENTING: Gemini 3 Flash Preview memerlukan thought_signature saat mengirim balik function call.
 */
export function extractModelContent(response: GeminiResponse): { role: string; parts: any[] } | null {
  try {
    const content = response.data?.candidates?.[0]?.content;
    if (!content) return null;
    return { role: content.role || 'model', parts: content.parts };
  } catch {
    return null;
  }
}

/**
 * Mengekstrak teks biasa dari response Gemini
 */
export function extractText(response: GeminiResponse): string {
  try {
    const parts = response.data?.candidates?.[0]?.content?.parts;
    if (!parts || !Array.isArray(parts)) return '';
    
    return parts
      .filter((p: any) => p.text)
      .map((p: any) => p.text)
      .join('');
  } catch {
    return '';
  }
}

export async function callGemini(apiUrl: string, apiKey: string, req: GeminiRequest): Promise<GeminiResponse> {
  const isGoogle = apiUrl.includes('generativelanguage.googleapis.com');

  // Build request URL and headers depending on provider
  let url = apiUrl;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (isGoogle) {
    const sep = apiUrl.includes('?') ? '&' : '?';
    url = `${apiUrl}${sep}key=${encodeURIComponent(apiKey)}`;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // Build a simple text representation of the request
  let promptText = '';
  if (typeof req.prompt === 'string') promptText = req.prompt;
  else if (req.messages && Array.isArray(req.messages)) {
    promptText = req.messages.map((m: any) => (m.content || m.text || JSON.stringify(m))).join('\n');
  } else if (req.options && typeof req.options === 'string') promptText = req.options;

  // Build request body for Google's generateContent API format
  const candidateBodies: Record<string, unknown>[] = [];
  if (isGoogle) {
    // Google generateContent API requires { contents: [{ role, parts: [{ text }] }] }
    let contents: unknown[] = [];
    if (req.messages && Array.isArray(req.messages) && req.messages.length > 0) {
      contents = (req.messages as any[]).map((m: any) => {
        // Support functionResponse parts (untuk step 2 function calling)
        if (m.parts) {
          return { role: m.role, parts: m.parts };
        }
        return {
          role: m.role === 'assistant' ? 'model' : (m.role || 'user'),
          parts: [{ text: m.content || m.text || JSON.stringify(m) }],
        };
      });
    } else if (promptText) {
      contents = [{ role: 'user', parts: [{ text: promptText }] }];
    }
    if (contents.length > 0) {
      const googleBody: Record<string, unknown> = { contents };
      if (req.systemInstruction) {
        googleBody.systemInstruction = { parts: [{ text: req.systemInstruction }] };
      }
      // Function calling: tambahkan tools dan toolConfig
      if (req.tools && req.tools.length > 0) {
        googleBody.tools = req.tools;
      }
      if (req.toolConfig) {
        googleBody.tool_config = req.toolConfig;
      }
      candidateBodies.push(googleBody);
    }
  } else {
    if (req.messages) candidateBodies.push({ messages: req.messages });
    if (req.prompt) candidateBodies.push({ prompt: req.prompt });
  }

  // Fallback to raw options if nothing built
  if (candidateBodies.length === 0) candidateBodies.push(req.options || { contents: [] });

  let lastResp: Response | null = null;
  let lastText = '';
  for (const body of candidateBodies) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      lastResp = resp;
      lastText = await resp.text().catch(() => '');
      if (resp.ok) {
        let parsed: unknown = lastText;
        try { parsed = JSON.parse(lastText); } catch (_) {}
        return { status: resp.status, ok: true, data: parsed, raw: lastText };
      } else {
        // try next candidate
        console.warn('Gemini candidate failed', { status: resp.status, body });
      }
    } catch (err) {
      console.error('Gemini request error for candidate', err);
    }
  }

  // All attempts failed; return last response info
  const status = lastResp ? lastResp.status : 502;
  let parsed: unknown = lastText;
  try { parsed = JSON.parse(lastText); } catch (_) {}
  return { status, ok: false, data: parsed, raw: lastText };
}
