import { api, Query } from "encore.dev/api";
import { db } from "../database/db";
import type { SubmissionRecord } from "../types/types";

export interface ListUserSubmissionsRequest {
  writer_email?: Query<string>;
}

export interface ListUserSubmissionsResponse {
  items: SubmissionRecord[];
}

// Lists submissions for a specific email address
export const listUserSubmissions = api<ListUserSubmissionsRequest, ListUserSubmissionsResponse>(
  { expose: true, method: "GET", path: "/submissions/my" },
  async (req) => {
    if (!req.writer_email) {
      return { items: [] };
    }
    
    const submissions = await db.queryAll<SubmissionRecord>`
      SELECT id, writer_name, writer_email, script_title, format, draft_version, 
             genre, region, platform, file_s3_key, status, created_at
      FROM submissions
      WHERE writer_email = ${req.writer_email}
      ORDER BY created_at DESC
    `;

    return { items: submissions };
  }
);
