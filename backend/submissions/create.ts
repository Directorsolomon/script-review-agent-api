import { api } from "encore.dev/api";
import { db } from "../database/db";
import type { Region, Platform } from "../types/types";

export interface CreateSubmissionRequest {
  writer_name: string;
  writer_email: string;
  script_title: string;
  format: 'feature' | 'series' | 'youtube_movie';
  draft_version: '1st' | '2nd' | '3rd';
  genre?: string;
  region?: Region;
  platform?: Platform;
  file_s3_key?: string;
}

export interface CreateSubmissionResponse {
  submissionId: string;
}

// Creates a new script submission
export const create = api<CreateSubmissionRequest, CreateSubmissionResponse>(
  { expose: true, method: "POST", path: "/submissions" },
  async (req) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.exec`
      INSERT INTO submissions (id, writer_name, writer_email, script_title, format, draft_version, genre, region, platform, file_s3_key, status, created_at)
      VALUES (${id}, ${req.writer_name}, ${req.writer_email}, ${req.script_title}, ${req.format}, ${req.draft_version}, ${req.genre || null}, ${req.region || null}, ${req.platform || 'YouTube'}, ${req.file_s3_key || null}, ${'queued'}, ${now})
    `;

    return { submissionId: id };
  }
);
