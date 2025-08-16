import { api } from "encore.dev/api";
import { db } from "../database/db";

export interface ProcessDocumentRequest {
  docId: string;
}

export interface ProcessDocumentResponse {
  ok: boolean;
}

// Processes a document for embeddings (placeholder implementation)
export const processDocument = api<ProcessDocumentRequest, ProcessDocumentResponse>(
  { expose: false, method: "POST", path: "/embeddings/process" },
  async (req) => {
    const doc = await db.queryRow`
      SELECT id, s3_key FROM docs WHERE id = ${req.docId}
    `;

    if (!doc) {
      throw new Error("Document not found");
    }

    // TODO: Implement actual embedding processing
    // 1. Download document from S3
    // 2. Extract text (PDF/DOCX parsing)
    // 3. Generate embeddings using OpenAI
    // 4. Store in vector database

    // For now, just mark the document as active
    await db.exec`
      UPDATE docs 
      SET status = 'active', updated_at = ${new Date().toISOString()}
      WHERE id = ${req.docId}
    `;

    return { ok: true };
  }
);
