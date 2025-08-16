import { api } from "encore.dev/api";
import { db } from "../database/db";
import { config } from "../config/config";

export interface PurgeOldDataRequest {
  dryRun?: boolean;
}

export interface PurgeOldDataResponse {
  deletedSubmissions: number;
  deletedDocChunks: number;
  deletedScriptChunks: number;
}

// Purges old data based on retention policy (80 days)
export const purgeOldData = api<PurgeOldDataRequest, PurgeOldDataResponse>(
  { expose: false, method: "POST", path: "/cleanup/purge" },
  async (req) => {
    const retentionDays = config.retentionDays;
    const dryRun = req.dryRun || false;

    // Find old submissions
    const oldSubmissions = await db.queryAll`
      SELECT id FROM submissions 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `;

    // Find chunks for inactive docs
    const inactiveDocChunks = await db.queryAll`
      SELECT c.id FROM admin_doc_chunks c
      JOIN docs d ON d.id = c.doc_id
      WHERE d.status = 'inactive' 
      AND d.created_at < NOW() - INTERVAL '${retentionDays} days'
    `;

    if (dryRun) {
      // Count what would be deleted
      const scriptChunks = await db.queryAll`
        SELECT COUNT(*) as count FROM script_chunks 
        WHERE submission_id = ANY(${oldSubmissions.map(s => s.id)})
      `;

      return {
        deletedSubmissions: oldSubmissions.length,
        deletedDocChunks: inactiveDocChunks.length,
        deletedScriptChunks: scriptChunks[0]?.count || 0,
      };
    }

    // Delete script chunks for old submissions
    const deletedScriptChunks = await db.queryAll`
      DELETE FROM script_chunks 
      WHERE submission_id = ANY(${oldSubmissions.map(s => s.id)})
      RETURNING id
    `;

    // Delete old submissions
    const deletedSubmissions = await db.queryAll`
      DELETE FROM submissions 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
      RETURNING id
    `;

    // Delete chunks for inactive docs
    const deletedDocChunks = await db.queryAll`
      DELETE FROM admin_doc_chunks 
      WHERE id = ANY(${inactiveDocChunks.map(c => c.id)})
      RETURNING id
    `;

    return {
      deletedSubmissions: deletedSubmissions.length,
      deletedDocChunks: deletedDocChunks.length,
      deletedScriptChunks: deletedScriptChunks.length,
    };
  }
);
