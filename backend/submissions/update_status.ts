import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";

export interface UpdateStatusRequest {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  notes?: string;
}

export interface UpdateStatusResponse {
  ok: boolean;
}

// Updates submission status (admin only)
export const updateStatus = api<UpdateStatusRequest, UpdateStatusResponse>(
  { expose: true, method: "PATCH", path: "/admin/submissions/:id/status" },
  async (req) => {
    const submission = await db.queryRow`
      SELECT id FROM submissions WHERE id = ${req.id}
    `;

    if (!submission) {
      throw APIError.notFound("Submission not found");
    }

    await db.exec`
      UPDATE submissions 
      SET status = ${req.status}, updated_at = ${new Date().toISOString()}
      WHERE id = ${req.id}
    `;

    return { ok: true };
  }
);
