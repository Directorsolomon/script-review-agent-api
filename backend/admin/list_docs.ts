import { api } from "encore.dev/api";
import { db } from "../database/db";
import { getAuthData } from "~encore/auth";
import type { DocRecord } from "../types/types";

export interface ListDocsResponse {
  items: DocRecord[];
}

// Lists all admin documents with auth check
export const listDocs = api<void, ListDocsResponse>(
  { auth: true, expose: true, method: "GET", path: "/admin/docs" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!['admin', 'editor', 'viewer'].includes(auth.role)) {
      throw new Error("Insufficient permissions");
    }

    const docs = await db.queryAll<DocRecord>`
      SELECT id, title, version, doc_type, region, platform, tags, status, s3_key, 
             created_at, updated_at
      FROM docs
      ORDER BY created_at DESC
    `;

    return { items: docs };
  }
);
