import { api } from "encore.dev/api";
import { db } from "../database/db";
import type { DocRecord } from "../types/types";

export interface ListDocsResponse {
  items: DocRecord[];
}

// Lists all admin documents
export const listDocs = api<void, ListDocsResponse>(
  { expose: true, method: "GET", path: "/admin/docs" },
  async () => {
    const docs = await db.queryAll<DocRecord>`
      SELECT id, title, version, doc_type, region, platform, tags, status, s3_key, 
             created_at, updated_at
      FROM docs
      ORDER BY created_at DESC
    `;

    return { items: docs };
  }
);
