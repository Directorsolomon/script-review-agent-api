import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { getAuthData } from "~encore/auth";
import type { ReportRecord } from "../types/types";

export interface GetReportRequest {
  submissionId: string;
}

// Gets the review report for a submission with auth check
export const getReport = api<GetReportRequest, ReportRecord>(
  { auth: true, expose: true, method: "GET", path: "/reports/:submissionId" },
  async (req) => {
    const auth = getAuthData()!;

    // Check if user has access to this report
    if (auth.role === 'user') {
      // Regular users can only access their own submissions
      const submission = await db.queryRow`
        SELECT writer_email FROM submissions WHERE id = ${req.submissionId}
      `;

      if (!submission || submission.writer_email !== auth.email) {
        throw APIError.notFound("Report not found");
      }
    }
    // Admin users can access any report

    const report = await db.queryRow<ReportRecord>`
      SELECT submission_id, overall_score, report_json, created_at, updated_at
      FROM reports
      WHERE submission_id = ${req.submissionId}
    `;

    if (!report) {
      throw APIError.notFound("Report not found");
    }

    return report;
  }
);
