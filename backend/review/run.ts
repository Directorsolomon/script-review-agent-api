import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { orchestrator } from "~encore/clients";
import { getAuthData } from "~encore/auth";

export interface RunReviewRequest {
  submissionId: string;
}

export interface RunReviewResponse {
  ok: boolean;
}

// Starts the review process for a submission with optional auth check
export const run = api<RunReviewRequest, RunReviewResponse>(
  { auth: false, expose: true, method: "POST", path: "/review/run/:submissionId" },
  async (req) => {
    const auth = getAuthData();

    // Validate input
    if (!req.submissionId || typeof req.submissionId !== 'string') {
      throw APIError.invalidArgument("Invalid submission ID");
    }

    const submission = await db.queryRow`
      SELECT id, file_s3_key, writer_email FROM submissions WHERE id = ${req.submissionId}
    `;

    if (!submission) {
      throw APIError.notFound("Submission not found");
    }

    // Check if user has access to this submission (only if authenticated)
    if (auth && auth.role === 'user' && submission.writer_email !== auth.email) {
      throw APIError.permissionDenied("Access denied");
    }

    if (!submission.file_s3_key) {
      throw APIError.invalidArgument("No script file found for submission");
    }

    // Call orchestrator with only the submission ID - no large payloads
    await orchestrator.processReview({ submissionId: req.submissionId });

    return { ok: true };
  }
);
