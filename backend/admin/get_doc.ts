import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import type { DocRecord } from "../types/types";

export interface GetDocRequest {
  id: string;
}

// Gets a specific admin document by ID
export const getDoc = api<GetDocRequest, DocRecord>(
  { expose: true, method: "GET", path: "/admin/docs/:id" },
  async (req) => {
    const doc = await db.queryRow<DocRecord>`
      SELECT id, title, version, doc_type, region, platform, tags, status, s3_key,
             created_at, updated_at
      FROM docs
      WHERE id = ${req.id}
    `;

    if (!doc) {
      throw APIError.notFound("Document not found");
    }

    return doc;
  }
);
