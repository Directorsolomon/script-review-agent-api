import { api } from "encore.dev/api";
import { db } from "../database/db";
import { text, embeddings } from "~encore/clients";
import { chunkText } from "../text/chunker";

export interface ProcessScriptRequest {
  submissionId: string;
  s3Key: string;
}

export interface ProcessScriptResponse {
  ok: boolean;
  chunksProcessed: number;
}

// Processes a script for embeddings using safe chunking
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

    try {
      // Extract text from script stored in S3
      const { text: extractedText } = await text.extractText({
        s3Key: req.s3Key,
      });

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No text could be extracted from script");
      }

      // Chunk the text into safe sizes
      const chunks = chunkText(extractedText);

      if (chunks.length === 0) {
        throw new Error("No chunks generated from script text");
      }

      console.log(`Processing ${chunks.length} chunks for submission ${req.submissionId}`);

      // Delete existing chunks for this submission
      await db.exec`
        DELETE FROM script_chunks WHERE submission_id = ${req.submissionId}
      `;

      // Process chunks with controlled concurrency to avoid rate limits
      const BATCH_SIZE = 3; // Safe concurrency limit
      let processedCount = 0;
      
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (chunk) => {
          try {
            await embeddings.embedChunk({
              submissionId: req.submissionId,
              chunkIndex: chunk.index,
              text: chunk.text,
            });
            return true;
          } catch (error) {
            console.error(`Failed to process chunk ${chunk.index}:`, error);
            return false;
          }
        });
        
        const results = await Promise.allSettled(batchPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        processedCount += successful;
        
        // Add small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (processedCount === 0) {
        throw new Error("Failed to process any chunks successfully");
      }

      if (processedCount < chunks.length) {
        console.warn(`Only processed ${processedCount}/${chunks.length} chunks successfully`);
      }

      console.log(`Successfully processed ${processedCount} chunks for submission ${req.submissionId}`);

      return { 
        ok: true, 
        chunksProcessed: processedCount 
      };

    } catch (error) {
      console.error(`Failed to process script for submission ${req.submissionId}:`, error);
      
      // Surface clear errors instead of generic "internal"
      if (error instanceof Error) {
        if (error.message.includes('payload_too_large') || (error as any).code === 'payload_too_large') {
          const newError = new Error(error.message);
          (newError as any).code = 'failed_precondition';
          throw newError;
        }
        if (error.message.includes('length limit exceeded')) {
          const newError = new Error('Script content is too large to process. Please reduce file size or split into smaller parts.');
          (newError as any).code = 'failed_precondition';
          throw newError;
        }
      }
      
      throw error;
    }
  }
);
