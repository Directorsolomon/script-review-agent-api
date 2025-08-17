import { api, Query, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { getAuthData } from "~encore/auth";
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

// Lists all submissions for admin users with filtering
export const listAdminSubmissions = api<ListAdminSubmissionsRequest, ListAdminSubmissionsResponse>(
  { auth: true, expose: true, method: "GET", path: "/admin/submissions" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!['admin', 'editor', 'viewer'].includes(auth.role)) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    const limit = req.limit || 50;
    const offset = req.offset || 0;

    // Build WHERE conditions
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

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM submissions ${whereClause}`;
    const countResult = await db.rawQueryRow(countQuery, params);
    const total = countResult?.total || 0;

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

    const submissions = await db.rawQueryAll(query, params);

    return {
      items: submissions as SubmissionRecord[],
      total,
    };
  }
);
