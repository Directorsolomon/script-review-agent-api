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
    // Validate input
    if (!req.submissionId || typeof req.submissionId !== 'string') {
      throw APIError.invalidArgument("Invalid submission ID");
    }

    const submission = await db.queryRow`
      SELECT id, file_s3_key FROM submissions WHERE id = ${req.submissionId}
    `;

    if (!submission) {
      throw APIError.notFound("Submission not found");
    }

    if (!submission.file_s3_key) {
      throw APIError.invalidArgument("No script file found for submission");
    }

    // Call orchestrator with only the submission ID - no large payloads
    await orchestrator.processReview({ submissionId: req.submissionId });

    return { ok: true };
  }
);
