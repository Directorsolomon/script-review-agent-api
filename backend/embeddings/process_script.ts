import { api } from "encore.dev/api";
import { db } from "../database/db";
import { text, embeddings } from "~encore/clients";
import { chunkText } from "../text/chunker";
import { badRequest, failedPrecondition } from "../lib/errors";

export interface ProcessScriptRequest {
  submissionId: string;
  s3Key: string;
}

export interface ProcessScriptResponse {
  ok: boolean;
  chunksProcessed: number;
  totalChunks: number;
  stats: {
    chars: number;
    estimatedPages: number;
  };
}

// Limit for concurrent embedding requests to avoid rate limits
const EMBEDDING_CONCURRENCY = 3;

// Processes a script for embeddings using safe chunking
export const processScript = api<ProcessScriptRequest, ProcessScriptResponse>(
  { expose: false, method: "POST", path: "/embeddings/script" },
  async (req) => {
    // Validate inputs - ensure we only accept IDs/keys, not large content
    if (!req.submissionId || typeof req.submissionId !== 'string') {
      throw badRequest("Invalid submission ID");
    }
    
    if (!req.s3Key || typeof req.s3Key !== 'string') {
      throw badRequest("Invalid S3 key");
    }

    try {
      // Extract text from script stored in S3
      const { text: extractedText, stats } = await text.extractText({
        s3Key: req.s3Key,
      });

      if (!extractedText || extractedText.trim().length === 0) {
        throw badRequest("No text could be extracted from script");
      }

      // Chunk the text into safe sizes
      const chunks = chunkText(extractedText);

      if (chunks.length === 0) {
        throw badRequest("No chunks generated from script text");
      }

      console.log(`Processing ${chunks.length} chunks for submission ${req.submissionId}`);

      // Delete existing chunks for this submission
      await db.exec`
        DELETE FROM script_chunks WHERE submission_id = ${req.submissionId}
      `;

      // Process chunks with controlled concurrency to avoid rate limits
      let processedCount = 0;
      const failures: string[] = [];
      
      for (let i = 0; i < chunks.length; i += EMBEDDING_CONCURRENCY) {
        const batch = chunks.slice(i, i + EMBEDDING_CONCURRENCY);
        
        const batchPromises = batch.map(async (chunk) => {
          try {
            await embeddings.embedChunk({
              submissionId: req.submissionId,
              chunkIndex: chunk.index,
              text: chunk.text,
            });
            return { success: true, index: chunk.index };
          } catch (error) {
            console.error(`Failed to process chunk ${chunk.index}:`, error);
            return { success: false, index: chunk.index, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });
        
        const results = await Promise.allSettled(batchPromises);
        
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.success) {
            processedCount++;
          } else if (result.status === 'fulfilled' && !result.value.success) {
            failures.push(`Chunk ${result.value.index}: ${result.value.error}`);
          } else {
            failures.push(`Chunk processing failed: ${result.reason}`);
          }
        }
        
        // Add small delay between batches to avoid rate limiting
        if (i + EMBEDDING_CONCURRENCY < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (processedCount === 0) {
        throw failedPrecondition("Failed to process any chunks successfully. " + failures.slice(0, 3).join('; '));
      }

      if (processedCount < chunks.length) {
        const failureRate = Math.round((failures.length / chunks.length) * 100);
        console.warn(`Only processed ${processedCount}/${chunks.length} chunks successfully (${failureRate}% failure rate)`);
        
        // If more than 50% failed, consider it a failure
        if (failureRate > 50) {
          throw failedPrecondition(`Embedding failed for ${failures.length}/${chunks.length} chunks. First few errors: ${failures.slice(0, 3).join('; ')}`);
        }
      }

      console.log(`Successfully processed ${processedCount} chunks for submission ${req.submissionId}`);

      return { 
        ok: true, 
        chunksProcessed: processedCount,
        totalChunks: chunks.length,
        stats,
      };

    } catch (error) {
      console.error(`Failed to process script for submission ${req.submissionId}:`, error);
      
      // Re-throw known error types without wrapping
      if (error instanceof Error && (error as any).code) {
        throw error;
      }
      
      // Surface clear errors instead of generic "internal"
      if (error instanceof Error) {
        if (error.message.includes('payload_too_large') || (error as any).code === 'payload_too_large') {
          throw error;
        }
        if (error.message.includes('length limit exceeded')) {
          throw badRequest('Script content is too large to process. Please reduce file size or split into smaller parts.');
        }
      }
      
      throw failedPrecondition(`Script processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
