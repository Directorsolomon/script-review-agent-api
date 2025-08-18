import { api } from "encore.dev/api";
import { db } from "../database/db";

export interface SubmissionStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface GetStatsResponse {
  stats: SubmissionStats;
}

// Gets submission statistics for admin dashboard
export const getStats = api<void, GetStatsResponse>(
  { expose: true, method: "GET", path: "/admin/submissions/stats" },
  async () => {
    const [
      totalResult,
      statusResults,
      todayResult,
      weekResult,
      monthResult
    ] = await Promise.all([
      db.queryRow`SELECT COUNT(*) as count FROM submissions`,
      db.queryAll`
        SELECT status, COUNT(*) as count 
        FROM submissions 
        GROUP BY status
      `,
      db.queryRow`
        SELECT COUNT(*) as count 
        FROM submissions 
        WHERE created_at >= CURRENT_DATE
      `,
      db.queryRow`
        SELECT COUNT(*) as count 
        FROM submissions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      `,
      db.queryRow`
        SELECT COUNT(*) as count 
        FROM submissions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `
    ]);

    const statusCounts = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    statusResults.forEach(row => {
      if (row.status in statusCounts) {
        statusCounts[row.status as keyof typeof statusCounts] = parseInt(row.count);
      }
    });

    const stats: SubmissionStats = {
      total: parseInt(totalResult?.count || '0'),
      ...statusCounts,
      today: parseInt(todayResult?.count || '0'),
      thisWeek: parseInt(weekResult?.count || '0'),
      thisMonth: parseInt(monthResult?.count || '0'),
    };

    return { stats };
  }
);
