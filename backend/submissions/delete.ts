import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";

export interface DeleteSubmissionRequest {
  id: string;
}

export interface DeleteSubmissionResponse {
  ok: boolean;
}

// Deletes a submission and all associated data (admin only)
export const deleteSubmission = api<DeleteSubmissionRequest, DeleteSubmissionResponse>(
  { expose: true, method: "DELETE", path: "/admin/submissions/:id" },
  async (req) => {
    const submission = await db.queryRow`
      SELECT id FROM submissions WHERE id = ${req.id}
    `;

    if (!submission) {
      throw APIError.notFound("Submission not found");
    }

    // Delete associated data in correct order (foreign key constraints)
    await db.exec`DELETE FROM script_chunks WHERE submission_id = ${req.id}`;
    await db.exec`DELETE FROM reports WHERE submission_id = ${req.id}`;
    await db.exec`DELETE FROM submissions WHERE id = ${req.id}`;

    return { ok: true };
  }
);
