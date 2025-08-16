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
    const embeddings: number[][] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 64;
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
        model: openai.embedding("text-embedding-3-large"),
        value: text,
      });
      return embedding;
    })
  );
  
  return results;
}
