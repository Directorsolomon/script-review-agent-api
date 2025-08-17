import { api, APIError } from "encore.dev/api";
import { config } from "../config/config";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";
import { db } from "../database/db";

const openai = createOpenAI({ apiKey: config.openaiApiKey() });

export interface EmbedChunkRequest {
  submissionId: string;
  chunkIndex: number;
  text: string;
}

export interface EmbedChunkResponse {
  submissionId: string;
  chunkIndex: number;
  success: boolean;
}

const MAX_CHUNK_SIZE = 6000; // Keep well below transport and embedding limits

// Check if vector type is available
async function isVectorAvailable(): Promise<boolean> {
  try {
    const result = await db.queryRow`
      SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') as available
    `;
    return result?.available || false;
  } catch {
    return false;
  }
}

// Embeds a single text chunk and stores it
export const embedChunk = api<EmbedChunkRequest, EmbedChunkResponse>(
  { expose: false, method: "POST", path: "/embeddings/chunk" },
  async (req) => {
    // Validate input size - fail fast with clear error
    if (!req.text || typeof req.text !== 'string') {
      throw APIError.invalidArgument("Text is required and must be a string");
    }
    
    if (req.text.length > MAX_CHUNK_SIZE) {
      const error = new Error(`Chunk too large (${req.text.length} chars). Maximum allowed: ${MAX_CHUNK_SIZE} chars.`);
      (error as any).code = 'invalid_argument';
      throw error;
    }
    
    if (req.text.trim().length === 0) {
      throw APIError.invalidArgument("Text chunk cannot be empty");
    }
    
    if (!req.submissionId || typeof req.submissionId !== 'string') {
      throw APIError.invalidArgument("Invalid submission ID");
    }
    
    if (typeof req.chunkIndex !== 'number' || req.chunkIndex < 0) {
      throw APIError.invalidArgument("Invalid chunk index");
    }

    const vectorAvailable = await isVectorAvailable();
    
    try {
      // Generate embedding for the chunk
      const { embedding } = await embed({
        model: openai.embedding("text-embedding-ada-002"),
        value: req.text,
      });
      
      // Store the chunk with its embedding
      if (vectorAvailable) {
        try {
          await db.exec`
            INSERT INTO script_chunks (submission_id, scene_index, page_start, page_end, text, embedding)
            VALUES (${req.submissionId}, ${req.chunkIndex}, ${null}, ${null}, ${req.text}, ${JSON.stringify(embedding)}::vector)
          `;
        } catch (vectorError) {
          console.warn("Vector insert failed, falling back to JSON:", vectorError);
          // Fallback to JSON string storage
          await db.exec`
            INSERT INTO script_chunks (submission_id, scene_index, page_start, page_end, text, embedding)
            VALUES (${req.submissionId}, ${req.chunkIndex}, ${null}, ${null}, ${req.text}, ${JSON.stringify(embedding)})
          `;
        }
      } else {
        // Store embedding as JSON string when vector type is not available
        await db.exec`
          INSERT INTO script_chunks (submission_id, scene_index, page_start, page_end, text, embedding)
          VALUES (${req.submissionId}, ${req.chunkIndex}, ${null}, ${null}, ${req.text}, ${JSON.stringify(embedding)})
        `;
      }
      
      return {
        submissionId: req.submissionId,
        chunkIndex: req.chunkIndex,
        success: true,
      };
      
    } catch (error) {
      console.error(`Failed to embed chunk ${req.chunkIndex} for submission ${req.submissionId}:`, error);
      
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
      
      throw APIError.internal(`Failed to generate embedding for chunk ${req.chunkIndex}`);
    }
  }
);
