import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";

export interface DeleteDocRequest {
  id: string;
}

export interface DeleteDocResponse {
  ok: boolean;
}

// Deletes an admin document and its associated chunks
export const deleteDoc = api<DeleteDocRequest, DeleteDocResponse>(
  { expose: true, method: "DELETE", path: "/admin/docs/:id" },
  async (req) => {
    // Check if document exists
    const doc = await db.queryRow`
      SELECT id FROM docs WHERE id = ${req.id}
    `;

    if (!doc) {
      throw APIError.notFound("Document not found");
    }

    // Delete associated chunks first (due to foreign key constraint)
    await db.exec`
      DELETE FROM admin_doc_chunks WHERE doc_id = ${req.id}
    `;

    // Delete the document
    await db.exec`
      DELETE FROM docs WHERE id = ${req.id}
    `;

    return { ok: true };
  }
);
