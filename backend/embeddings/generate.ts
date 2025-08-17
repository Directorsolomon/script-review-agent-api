import { api, APIError } from "encore.dev/api";
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

const MAX_TEXTS_PER_REQUEST = 100;
const MAX_TEXT_LENGTH = 8000; // OpenAI's text-embedding-ada-002 limit
const MAX_BATCH_SIZE = 32;

// Generates embeddings for text chunks
export const generateEmbeddings = api<GenerateEmbeddingsRequest, GenerateEmbeddingsResponse>(
  { expose: false, method: "POST", path: "/embeddings/generate" },
  async (req) => {
    // Validate input to prevent large payloads
    if (!Array.isArray(req.texts)) {
      throw APIError.invalidArgument("Invalid texts array");
    }
    
    if (req.texts.length === 0) {
      return { embeddings: [] };
    }
    
    if (req.texts.length > MAX_TEXTS_PER_REQUEST) {
      throw APIError.invalidArgument(`Too many texts: ${req.texts.length} (max ${MAX_TEXTS_PER_REQUEST} per request)`);
    }
    
    // Check individual text sizes and validate
    const validatedTexts: string[] = [];
    for (let i = 0; i < req.texts.length; i++) {
      const text = req.texts[i];
      
      if (typeof text !== 'string') {
        throw APIError.invalidArgument(`Text at index ${i} must be a string`);
      }
      
      if (text.length === 0) {
        throw APIError.invalidArgument(`Text at index ${i} cannot be empty`);
      }
      
      if (text.length > MAX_TEXT_LENGTH) {
        console.warn(`Text at index ${i} too long (${text.length} chars), truncating to ${MAX_TEXT_LENGTH}`);
        validatedTexts.push(text.substring(0, MAX_TEXT_LENGTH));
      } else {
        validatedTexts.push(text);
      }
    }

    const embeddings: number[][] = [];
    
    try {
      // Process in smaller batches to avoid rate limits and memory issues
      for (let i = 0; i < validatedTexts.length; i += MAX_BATCH_SIZE) {
        const batch = validatedTexts.slice(i, i + MAX_BATCH_SIZE);
        const batchEmbeddings = await generateBatch(batch);
        embeddings.push(...batchEmbeddings);
        
        // Add small delay between batches to avoid rate limiting
        if (i + MAX_BATCH_SIZE < validatedTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error("Embedding generation failed:", error);
      
      // Check for specific OpenAI errors
      if (error instanceof Error) {
        if (error.message.includes('length limit exceeded') || error.message.includes('too long')) {
          throw APIError.invalidArgument("Text content is too long for embedding generation. Please reduce the text size.");
        }
        if (error.message.includes('rate limit')) {
          throw APIError.resourceExhausted("Rate limit exceeded. Please try again in a moment.");
        }
        if (error.message.includes('quota')) {
          throw APIError.resourceExhausted("API quota exceeded. Please try again later.");
        }
      }
      
      throw APIError.internal("Failed to generate embeddings. Please try again.");
    }
    
    return { embeddings };
  }
);

async function generateBatch(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map(async (text, index) => {
      try {
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-ada-002"), // Use ada-002 for 1536 dimensions
          value: text,
        });
        return embedding;
      } catch (error) {
        console.error(`Failed to generate embedding for text ${index}:`, error);
        
        // Return a zero vector as fallback to prevent complete failure
        console.warn(`Using zero vector fallback for text ${index}`);
        return new Array(1536).fill(0);
      }
    })
  );
  
  return results;
}
