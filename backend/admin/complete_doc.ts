import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { embeddings } from "~encore/clients";

export interface CompleteDocRequest {
  docId: string;
}

export interface CompleteDocResponse {
  ok: boolean;
}

// Marks a document upload as complete and triggers embedding processing
export const completeDoc = api<CompleteDocRequest, CompleteDocResponse>(
  { expose: true, method: "POST", path: "/admin/docs/complete" },
  async (req) => {
    const doc = await db.queryRow`
      SELECT id FROM docs WHERE id = ${req.docId}
    `;

    if (!doc) {
      throw APIError.notFound("Document not found");
    }

    await embeddings.processDocument({ docId: req.docId });

    return { ok: true };
  }
);
