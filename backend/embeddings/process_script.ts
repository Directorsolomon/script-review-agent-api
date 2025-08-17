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
    // Validate inputs - ensure we only accept IDs/keys, not large content
    if (!req.submissionId || typeof req.submissionId !== 'string') {
      throw new Error("Invalid submission ID");
    }
    
    if (!req.s3Key || typeof req.s3Key !== 'string') {
      throw new Error("Invalid S3 key");
    }

    const vectorAvailable = await isVectorAvailable();

    try {
      // Extract text from script stored in S3 - this is where large content is handled
      const { text: extractedText } = await text.extractText({
        s3Key: req.s3Key,
      });

      // Chunk the text into manageable pieces
      const { chunks } = await text.chunkText({
        text: extractedText,
        maxTokens: 800,
        overlap: 120,
      });

      // Generate embeddings for chunks - process in batches to avoid memory issues
      const { embeddings: chunkEmbeddings } = await embeddings.generateEmbeddings({
        texts: chunks.map(c => c.text),
      });

      // Delete existing chunks for this submission
      await db.exec`
        DELETE FROM script_chunks WHERE submission_id = ${req.submissionId}
      `;

      // Insert new chunks with embeddings in batches
      const batchSize = 50;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        const batchEmbeddings = chunkEmbeddings.slice(i, i + batchSize);
        
        for (let j = 0; j < batchChunks.length; j++) {
          const chunk = batchChunks[j];
          const embedding = batchEmbeddings[j];
          
          if (vectorAvailable) {
            await db.exec`
              INSERT INTO script_chunks (submission_id, scene_index, page_start, page_end, text, embedding)
              VALUES (${req.submissionId}, ${null}, ${null}, ${null}, ${chunk.text}, ${JSON.stringify(embedding)}::vector)
            `;
          } else {
            // Store embedding as JSON string when vector type is not available
            await db.exec`
              INSERT INTO script_chunks (submission_id, scene_index, page_start, page_end, text, embedding)
              VALUES (${req.submissionId}, ${null}, ${null}, ${null}, ${chunk.text}, ${JSON.stringify(embedding)})
            `;
          }
        }
      }

    } catch (error) {
      console.error(`Failed to process script for submission ${req.submissionId}:`, error);
      throw error;
    }

    return { ok: true };
  }
);
