import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { embeddings } from "~encore/clients";
import { getAuthData } from "~encore/auth";

export interface CompleteDocRequest {
  docId: string;
}

export interface CompleteDocResponse {
  ok: boolean;
}

// Marks a document upload as complete and triggers embedding processing with auth check
export const completeDoc = api<CompleteDocRequest, CompleteDocResponse>(
  { auth: true, expose: true, method: "POST", path: "/admin/docs/complete" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!['admin', 'editor'].includes(auth.role)) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

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
