import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import type { SubmissionRecord } from "../types/types";

export interface GetSubmissionRequest {
  id: string;
}

// Gets a specific submission by ID
export const get = api<GetSubmissionRequest, SubmissionRecord>(
  { expose: true, method: "GET", path: "/submissions/:id" },
  async (req) => {
    const submission = await db.queryRow<SubmissionRecord>`
      SELECT id, writer_name, writer_email, script_title, format, draft_version, genre, region, platform, file_s3_key, status, created_at
      FROM submissions
      WHERE id = ${req.id}
    `;

    if (!submission) {
      throw APIError.notFound("Submission not found");
    }

    return submission;
  }
);
