import { api } from "encore.dev/api";
import { db } from "../database/db";
import { text, embeddings } from "~encore/clients";

export interface ProcessDocumentRequest {
  docId: string;
}

export interface ProcessDocumentResponse {
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

// Processes a document for embeddings and stores chunks
export const processDocument = api<ProcessDocumentRequest, ProcessDocumentResponse>(
  { expose: false, method: "POST", path: "/embeddings/process" },
  async (req) => {
    const doc = await db.queryRow`
      SELECT id, s3_key FROM docs WHERE id = ${req.docId}
    `;

    if (!doc) {
      throw new Error("Document not found");
    }

    const vectorAvailable = await isVectorAvailable();

    try {
      // Extract text from document
      const { text: extractedText } = await text.extractText({
        s3Key: doc.s3_key,
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

      // Delete existing chunks for this document
      await db.exec`
        DELETE FROM admin_doc_chunks WHERE doc_id = ${req.docId}
      `;

      // Insert new chunks with embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = chunkEmbeddings[i];
        
        if (vectorAvailable) {
          await db.exec`
            INSERT INTO admin_doc_chunks (doc_id, section, line_start, line_end, text, priority_weight, embedding)
            VALUES (${req.docId}, ${chunk.section || null}, ${chunk.lineStart || null}, ${chunk.lineEnd || null}, ${chunk.text}, ${1.0}, ${JSON.stringify(embedding)})
          `;
        } else {
          // Store embedding as JSON string when vector type is not available
          await db.exec`
            INSERT INTO admin_doc_chunks (doc_id, section, line_start, line_end, text, priority_weight, embedding)
            VALUES (${req.docId}, ${chunk.section || null}, ${chunk.lineStart || null}, ${chunk.lineEnd || null}, ${chunk.text}, ${1.0}, ${JSON.stringify(embedding)})
          `;
        }
      }

      // Mark document as active
      await db.exec`
        UPDATE docs 
        SET status = 'active', updated_at = ${new Date().toISOString()}
        WHERE id = ${req.docId}
      `;

    } catch (error) {
      console.error(`Failed to process document ${req.docId}:`, error);
      throw error;
    }

    return { ok: true };
  }
);
