import { api } from "encore.dev/api";
import { db } from "../database/db";
import { getAuthData } from "~encore/auth";
import type { SubmissionRecord } from "../types/types";

export interface ListUserSubmissionsResponse {
  items: SubmissionRecord[];
}

// Lists submissions for the authenticated user
export const listUserSubmissions = api<void, ListUserSubmissionsResponse>(
  { auth: true, expose: true, method: "GET", path: "/submissions/my" },
  async () => {
    const auth = getAuthData()!;
    
    const submissions = await db.queryAll<SubmissionRecord>`
      SELECT id, writer_name, writer_email, script_title, format, draft_version, 
             genre, region, platform, file_s3_key, status, created_at
      FROM submissions
      WHERE writer_email = ${auth.email}
      ORDER BY created_at DESC
    `;

    return { items: submissions };
  }
);
