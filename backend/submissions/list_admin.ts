import { api, Query } from "encore.dev/api";
import { db } from "../database/db";
import type { SubmissionRecord } from "../types/types";

export interface ListAdminSubmissionsRequest {
  status?: Query<string>;
  writer_email?: Query<string>;
  region?: Query<string>;
  platform?: Query<string>;
  from_date?: Query<string>;
  to_date?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

export interface ListAdminSubmissionsResponse {
  items: SubmissionRecord[];
  total: number;
}

// Lists all submissions with filtering
export const listAdminSubmissions = api<ListAdminSubmissionsRequest, ListAdminSubmissionsResponse>(
  { expose: true, method: "GET", path: "/admin/submissions" },
  async (req) => {
    const limit = req.limit || 50;
    const offset = req.offset || 0;

    // Use conditional queries with template literals for better safety
    let countResult;
    let submissions: SubmissionRecord[];

    if (!req.status && !req.writer_email && !req.region && !req.platform && !req.from_date && !req.to_date) {
      // No filters - simple query
      countResult = await db.queryRow`SELECT COUNT(*) as total FROM submissions`;
      submissions = await db.queryAll<SubmissionRecord>`
        SELECT id, writer_name, writer_email, script_title, format, draft_version,
               genre, region, platform, file_s3_key, status, created_at
        FROM submissions
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Build filtered queries using template literals
      if (req.status && req.writer_email && req.region && req.platform && req.from_date && req.to_date) {
        // All filters
        const emailPattern = `%${req.writer_email}%`;
        countResult = await db.queryRow`
          SELECT COUNT(*) as total FROM submissions
          WHERE status = ${req.status}
            AND writer_email ILIKE ${emailPattern}
            AND region = ${req.region}
            AND platform = ${req.platform}
            AND created_at >= ${req.from_date}
            AND created_at <= ${req.to_date}
        `;
        submissions = await db.queryAll<SubmissionRecord>`
          SELECT id, writer_name, writer_email, script_title, format, draft_version,
                 genre, region, platform, file_s3_key, status, created_at
          FROM submissions
          WHERE status = ${req.status}
            AND writer_email ILIKE ${emailPattern}
            AND region = ${req.region}
            AND platform = ${req.platform}
            AND created_at >= ${req.from_date}
            AND created_at <= ${req.to_date}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        // For partial filters, we'll use a more flexible approach
        // This is safer than string concatenation but still uses parameterized queries
        const conditions: string[] = [];
        const params: any[] = [];

        if (req.status) {
          params.push(req.status);
          conditions.push(`status = $${params.length}`);
        }

        if (req.writer_email) {
          params.push(`%${req.writer_email}%`);
          conditions.push(`writer_email ILIKE $${params.length}`);
        }

        if (req.region) {
          params.push(req.region);
          conditions.push(`region = $${params.length}`);
        }

        if (req.platform) {
          params.push(req.platform);
          conditions.push(`platform = $${params.length}`);
        }

        if (req.from_date) {
          params.push(req.from_date);
          conditions.push(`created_at >= $${params.length}`);
        }

        if (req.to_date) {
          params.push(req.to_date);
          conditions.push(`created_at <= $${params.length}`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get count
        const countQuery = `SELECT COUNT(*) as total FROM submissions ${whereClause}`;
        countResult = await db.rawQueryRow(countQuery, params);

        // Get submissions
        params.push(limit, offset);
        const query = `
          SELECT id, writer_name, writer_email, script_title, format, draft_version,
                 genre, region, platform, file_s3_key, status, created_at
          FROM submissions
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${params.length - 1} OFFSET $${params.length}
        `;
        submissions = await db.rawQueryAll(query, params) as SubmissionRecord[];
      }
    }

    const total = countResult?.total || 0;

    return {
      items: submissions,
      total,
    };
  }
);
