import { getEmbedding } from "./semanticRouter.embedding.ts";
import { getCache, setCache, invalidateCache } from "./utils/cache.ts";

// ==================== TYPES ====================

export type ConfidenceLabel = "TINGGI" | "SEDANG" | "RENDAH" | "TIDAK_COCOK";

export interface IngredientMatchResult {
  ocr_name: string;
  matched_id: string | null;
  matched_name: string | null;
  confidence: number;
  confidence_label: ConfidenceLabel;
  method: "embedding" | "string_fallback";
}

export interface IngredientRecord {
  _id: string;
  name: string;
}

// ==================== THRESHOLD CONFIG ====================

// Threshold mapping: nilai confidence → label
export function getConfidenceLabel(score: number, threshold: number): ConfidenceLabel {
  const highThreshold = threshold;
  const medThreshold = threshold - 0.15;
  const lowThreshold = threshold - 0.25;

  if (score >= highThreshold) return "TINGGI";
  if (score >= medThreshold) return "SEDANG";
  if (score >= lowThreshold) return "RENDAH";
  return "TIDAK_COCOK";
}

// ==================== COSINE SIMILARITY ====================

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ==================== STRING MATCHING FALLBACK ====================

function stringMatchFallback(
  ocrName: string,
  ingredients: IngredientRecord[],
  threshold: number
): Omit<IngredientMatchResult, "method"> {
  const lower = ocrName.toLowerCase().trim();

  // 1. Exact match
  const exact = ingredients.find(i => i.name.toLowerCase() === lower);
  if (exact) {
    return {
      ocr_name: ocrName,
      matched_id: exact._id,
      matched_name: exact.name,
      confidence: 1.0,
      confidence_label: getConfidenceLabel(1.0, threshold),
    };
  }

  // 2. Contains match
  const partial = ingredients.find(i =>
    i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase())
  );
  if (partial) {
    const score = 0.72;
    return {
      ocr_name: ocrName,
      matched_id: partial._id,
      matched_name: partial.name,
      confidence: score,
      confidence_label: getConfidenceLabel(score, threshold),
    };
  }

  // 3. Word-based match
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  let bestWord: IngredientRecord | null = null;
  let bestWordScore = 0;

  for (const ing of ingredients) {
    const ingWords = ing.name.toLowerCase().split(/\s+/);
    const matchCount = words.filter(w => ingWords.some(iw => iw.includes(w) || w.includes(iw))).length;
    if (matchCount > 0) {
      const score = 0.55 + (matchCount / Math.max(words.length, ingWords.length)) * 0.1;
      if (score > bestWordScore) {
        bestWordScore = score;
        bestWord = ing;
      }
    }
  }

  if (bestWord) {
    return {
      ocr_name: ocrName,
      matched_id: bestWord._id,
      matched_name: bestWord.name,
      confidence: bestWordScore,
      confidence_label: getConfidenceLabel(bestWordScore, threshold),
    };
  }

  return {
    ocr_name: ocrName,
    matched_id: null,
    matched_name: null,
    confidence: 0,
    confidence_label: "TIDAK_COCOK",
  };
}

// ==================== EMBEDDING CACHE ====================

const CACHE_KEY_PREFIX = "ocr_ingredient_emb:";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam

async function getIngredientEmbedding(ingredient: IngredientRecord): Promise<number[] | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${ingredient._id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const embedding = await getEmbedding(ingredient.name);
  if (embedding) {
    setCache(cacheKey, embedding, CACHE_TTL_MS);
  }
  return embedding;
}

// ==================== MAIN MATCHER ====================

/**
 * Cocokkan array nama item OCR ke ingredient di database menggunakan embedding.
 * Jika embedding gagal untuk item tertentu, otomatis fallback ke string matching.
 *
 * @param ocrNames - Array nama barang dari hasil OCR
 * @param ingredients - Seluruh ingredient dari database
 * @param threshold - Nilai confidence minimum untuk dianggap TINGGI (0.5–0.95)
 */
export async function matchIngredientsByEmbedding(
  ocrNames: string[],
  ingredients: IngredientRecord[],
  threshold: number = 0.75
): Promise<IngredientMatchResult[]> {
  if (!ocrNames.length || !ingredients.length) {
    return ocrNames.map(name => ({
      ocr_name: name,
      matched_id: null,
      matched_name: null,
      confidence: 0,
      confidence_label: "TIDAK_COCOK" as ConfidenceLabel,
      method: "string_fallback" as const,
    }));
  }

  // Pre-compute embeddings untuk semua ingredient (dengan caching per-ID)
  const ingEmbeddings: { ing: IngredientRecord; vec: number[] | null }[] = await Promise.all(
    ingredients.map(async (ing) => ({
      ing,
      vec: await getIngredientEmbedding(ing),
    }))
  );

  const results: IngredientMatchResult[] = [];

  for (const ocrName of ocrNames) {
    if (!ocrName?.trim()) {
      results.push({
        ocr_name: ocrName,
        matched_id: null,
        matched_name: null,
        confidence: 0,
        confidence_label: "TIDAK_COCOK",
        method: "string_fallback",
      });
      continue;
    }

    // Coba embedding untuk query OCR
    let queryVec: number[] | null = null;
    try {
      queryVec = await getEmbedding(ocrName.trim());
    } catch {
      // embedding gagal → lanjut ke fallback
    }

    // Jika embedding berhasil, pakai cosine similarity
    if (queryVec) {
      let bestScore = -1;
      let bestIng: IngredientRecord | null = null;

      for (const { ing, vec } of ingEmbeddings) {
        if (!vec) continue;
        const score = cosineSimilarity(queryVec, vec);
        if (score > bestScore) {
          bestScore = score;
          bestIng = ing;
        }
      }

      const label = getConfidenceLabel(bestScore, threshold);
      const isMatch = label !== "TIDAK_COCOK";

      results.push({
        ocr_name: ocrName,
        matched_id: isMatch && bestIng ? bestIng._id : null,
        matched_name: isMatch && bestIng ? bestIng.name : null,
        confidence: Math.round(bestScore * 1000) / 1000,
        confidence_label: label,
        method: "embedding",
      });
    } else {
      // Fallback ke string matching
      const fallback = stringMatchFallback(ocrName, ingredients, threshold);
      results.push({ ...fallback, method: "string_fallback" });
    }
  }

  return results;
}

// ==================== CACHE INVALIDATION ====================

/**
 * Hapus semua embedding ingredient dari cache.
 * Dipanggil oleh Mongoose hook saat ingredient berubah.
 */
export function invalidateIngredientEmbeddingCache(): void {
  invalidateCache(CACHE_KEY_PREFIX);
}
