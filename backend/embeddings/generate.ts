import { api } from "encore.dev/api";
import { config } from "../config/config";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";

const openai = createOpenAI({ apiKey: config.openaiApiKey() });

export interface GenerateEmbeddingsRequest {
  texts: string[];
}

export interface GenerateEmbeddingsResponse {
  embeddings: number[][];
}

// Generates embeddings for text chunks
export const generateEmbeddings = api<GenerateEmbeddingsRequest, GenerateEmbeddingsResponse>(
  { expose: false, method: "POST", path: "/embeddings/generate" },
  async (req) => {
    // Validate input to prevent large payloads
    if (!Array.isArray(req.texts)) {
      throw new Error("Invalid texts array");
    }
    
    if (req.texts.length === 0) {
      return { embeddings: [] };
    }
    
    if (req.texts.length > 100) {
      throw new Error(`Too many texts: ${req.texts.length} (max 100 per request)`);
    }
    
    // Check individual text sizes
    for (const text of req.texts) {
      if (typeof text !== 'string') {
        throw new Error("All texts must be strings");
      }
      if (text.length > 8000) { // Reasonable limit for embedding input
        throw new Error(`Text too long: ${text.length} characters (max 8000)`);
      }
    }

    const embeddings: number[][] = [];
    
    // Process in smaller batches to avoid rate limits and memory issues
    const batchSize = 32; // Reduced batch size
    for (let i = 0; i < req.texts.length; i += batchSize) {
      const batch = req.texts.slice(i, i + batchSize);
      const batchEmbeddings = await generateBatch(batch);
      embeddings.push(...batchEmbeddings);
    }
    
    return { embeddings };
  }
);

async function generateBatch(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map(async (text) => {
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-ada-002"), // Use ada-002 for 1536 dimensions
        value: text,
      });
      return embedding;
    })
  );
  
  return results;
}
