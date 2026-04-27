import { TOOL_DECLARATIONS } from "./toolDeclarations.ts";
import { getRelevantTools as getRelevantToolsKeyword } from "./semanticRouter.ts";
import { pipeline, env } from "npm:@xenova/transformers";
import { Buffer } from "node:buffer";

// Inject Buffer globally for onnxruntime-node compatibility in Deno
if (typeof (globalThis as any).Buffer === "undefined") {
  (globalThis as any).Buffer = Buffer;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

const toolEmbeddingsCache: Record<string, number[]> = {};
let isToolEmbeddingsInitialized = false;
let embeddingPipeline: any = null;

// Initialize the pipeline
async function getPipeline() {
  if (!embeddingPipeline) {
    try {
      // Menggunakan model ringan all-MiniLM-L6-v2 (hanya ~22MB)
      embeddingPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    } catch (err) {
      console.error("Gagal inisialisasi Transformers.js:", err);
      return null;
    }
  }
  return embeddingPipeline;
}

export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const extractor = await getPipeline();
    if (!extractor) return null;

    const output = await extractor(text, { pooling: 'mean', normalize: true });
    // output.data berisi array float32 dari vector
    return Array.from(output.data);
  } catch (err) {
    console.error("Embedding Local error:", err);
    return null;
  }
}

export async function initToolEmbeddings() {
  if (isToolEmbeddingsInitialized) return;
  const tools = (TOOL_DECLARATIONS[0] as any).functionDeclarations;
  
  for (const tool of tools) {
    const textToEmbed = `${tool.name} ${tool.description}`;
    const embedding = await getEmbedding(textToEmbed);
    if (embedding) {
      toolEmbeddingsCache[tool.name] = embedding;
    }
  }
  isToolEmbeddingsInitialized = true;
}

// Signature fungsi dipertahankan agar kompatibel
export async function getRelevantToolsEmbedding(query: string): Promise<any[]> {
  try {
    if (!isToolEmbeddingsInitialized) {
       await initToolEmbeddings();
    }

    const queryEmbedding = await getEmbedding(query);
    if (!queryEmbedding) {
      return getRelevantToolsKeyword(query);
    }

    const tools = (TOOL_DECLARATIONS[0] as any).functionDeclarations;
    const scoredTools = tools.map((tool: any) => {
      const toolEmbedding = toolEmbeddingsCache[tool.name];
      if (!toolEmbedding) return { tool, score: -1 };
      return {
        tool,
        score: cosineSimilarity(queryEmbedding, toolEmbedding)
      };
    });

    scoredTools.sort((a: any, b: any) => b.score - a.score);
    
    // threshold: 0.45 lumayan presisi untuk MiniLM
    const topTools = scoredTools.filter((t: any) => t.score > 0.45).map((t: any) => t.tool);
    
    if (topTools.length === 0) {
      return getRelevantToolsKeyword(query);
    }
    
    // Safety check manual
    if (query.match(/laporan|report|lengkap|overview|ringkasan/i)) {
       const reportTool = tools.find((t: any) => t.name === "get_comprehensive_report");
       if (reportTool && !topTools.find((t: any) => t.name === "get_comprehensive_report")) {
         topTools.push(reportTool);
       }
    }
    
    return topTools;
  } catch (err) {
    console.error("Semantic Router Error:", err);
    return getRelevantToolsKeyword(query);
  }
}
