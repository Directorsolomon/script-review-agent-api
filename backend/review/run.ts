import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { orchestrator } from "~encore/clients";
import { toHttpError } from "../lib/errors";

export interface RunReviewRequest {
  submissionId: string;
}

export interface RunReviewResponse {
  ok: boolean;
  message?: string;
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
      SELECT id, file_s3_key, status FROM submissions WHERE id = ${req.submissionId}
    `;

    if (!submission) {
      throw APIError.notFound("Submission not found");
    }

    if (!submission.file_s3_key) {
      throw APIError.invalidArgument("No script file found for submission");
    }

    // Don't restart if already processing or completed
    if (submission.status === 'processing') {
      throw APIError.invalidArgument("Review is already in progress");
    }

    try {
      // Call orchestrator with only the submission ID - no large payloads
      const result = await orchestrator.processReview({ submissionId: req.submissionId });
      
      let message = "Review completed successfully";
      if (result.stats) {
        message += `. Processed ${result.stats.chunksProcessed}/${result.stats.totalChunks} chunks (${result.stats.estimatedPages} estimated pages).`;
      }
      
      return { ok: true, message };
    } catch (error) {
      console.error("Failed to start review process:", error);
      
      // Map specific error types to appropriate HTTP responses
      if (error instanceof Error && (error as any).code) {
        const httpError = toHttpError(error);
        
        // Update submission status to failed for non-client errors
        if (httpError.status >= 500) {
          await db.exec`
            UPDATE submissions 
            SET status = 'failed' 
            WHERE id = ${req.submissionId}
          `;
        }
        
        // Throw with proper error mapping
        switch ((error as any).code) {
          case 'invalid_argument':
            throw APIError.invalidArgument(error.message);
          case 'payload_too_large':
            throw APIError.invalidArgument(error.message); // Map to 400 for client handling
          case 'failed_precondition':
            throw APIError.failedPrecondition(error.message);
          case 'upstream_error':
            throw APIError.internal(error.message);
          default:
            throw APIError.internal(error.message);
        }
      }
      
      // Update submission status to failed
      await db.exec`
        UPDATE submissions 
        SET status = 'failed' 
        WHERE id = ${req.submissionId}
      `;
      
      throw APIError.internal("Failed to start review process");
    }
  }
);
