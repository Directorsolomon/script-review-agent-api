import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import type { ReportRecord } from "../types/types";

export interface GetReportRequest {
  submissionId: string;
}

// Gets the review report for a submission
export const getReport = api<GetReportRequest, ReportRecord>(
  { expose: true, method: "GET", path: "/reports/:submissionId" },
  async (req) => {
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
