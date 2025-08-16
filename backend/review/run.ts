import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { orchestrator } from "~encore/clients";

export interface RunReviewRequest {
  submissionId: string;
}

export interface RunReviewResponse {
  ok: boolean;
}

// Starts the review process for a submission
export const run = api<RunReviewRequest, RunReviewResponse>(
  { expose: true, method: "POST", path: "/review/run/:submissionId" },
  async (req) => {
    const submission = await db.queryRow`
      SELECT id FROM submissions WHERE id = ${req.submissionId}
    `;

    if (!submission) {
      throw APIError.notFound("Submission not found");
    }

    await orchestrator.processReview({ submissionId: req.submissionId });

    return { ok: true };
  }
);
