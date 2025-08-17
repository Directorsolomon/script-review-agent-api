import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { getAuthData } from "~encore/auth";
import type { DocRecord } from "../types/types";

export interface GetDocRequest {
  id: string;
}

// Gets a specific admin document by ID with auth check
export const getDoc = api<GetDocRequest, DocRecord>(
  { auth: true, expose: true, method: "GET", path: "/admin/docs/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!['admin', 'editor', 'viewer'].includes(auth.role)) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

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
