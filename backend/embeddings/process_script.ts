import { api } from "encore.dev/api";
import { db } from "../database/db";
import { text, embeddings } from "~encore/clients";

export interface ProcessScriptRequest {
  submissionId: string;
  s3Key: string;
}

export interface ProcessScriptResponse {
  ok: boolean;
}

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

// Processes a script for embeddings and stores chunks
export const processScript = api<ProcessScriptRequest, ProcessScriptResponse>(
  { expose: false, method: "POST", path: "/embeddings/script" },
  async (req) => {
    const vectorAvailable = await isVectorAvailable();

    try {
      // Extract text from script
      const { text: extractedText } = await text.extractText({
        s3Key: req.s3Key,
      });

      // Chunk the text
      const { chunks } = await text.chunkText({
        text: extractedText,
        maxTokens: 800,
        overlap: 120,
      });

      // Generate embeddings for chunks
      const { embeddings: chunkEmbeddings } = await embeddings.generateEmbeddings({
        texts: chunks.map(c => c.text),
      });

      // Delete existing chunks for this submission
      await db.exec`
        DELETE FROM script_chunks WHERE submission_id = ${req.submissionId}
      `;

      // Insert new chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = chunkEmbeddings[i];
        
        if (vectorAvailable) {
          await db.exec`
            INSERT INTO script_chunks (submission_id, scene_index, page_start, page_end, text, embedding)
            VALUES (${req.submissionId}, ${null}, ${null}, ${null}, ${chunk.text}, ${JSON.stringify(embedding)})
          `;
        } else {
          // Store embedding as JSON string when vector type is not available
          await db.exec`
            INSERT INTO script_chunks (submission_id, scene_index, page_start, page_end, text, embedding)
            VALUES (${req.submissionId}, ${null}, ${null}, ${null}, ${chunk.text}, ${JSON.stringify(embedding)})
          `;
        }
      }

    } catch (error) {
      console.error(`Failed to process script for submission ${req.submissionId}:`, error);
      throw error;
    }

    return { ok: true };
  }
);
