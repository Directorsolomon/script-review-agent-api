import { api } from "encore.dev/api";
import { storage } from "~encore/clients";
import { db } from "../database/db";
import { getAuthData } from "~encore/auth";
import type { DocType, Region, Platform } from "../types/types";

export interface PresignDocRequest {
  filename: string;
  contentType: string;
  size: number;
  title: string;
  version: string;
  doc_type: DocType;
  region?: Region;
  platform?: Platform;
  tags?: string[];
}

export interface PresignDocResponse {
  docId: string;
  uploadUrl: string;
  s3Key: string;
}

// Creates a presigned URL for admin document uploads with auth check
export const presignDoc = api<PresignDocRequest, PresignDocResponse>(
  { auth: true, expose: true, method: "POST", path: "/admin/docs/presign" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!['admin', 'editor'].includes(auth.role)) {
      throw new Error("Insufficient permissions");
    }

    const { uploadUrl, s3Key } = await storage.presignDoc({
      filename: req.filename,
      contentType: req.contentType,
      size: req.size,
    });

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.exec`
      INSERT INTO docs (id, title, version, doc_type, region, platform, tags, s3_key, created_at, updated_at)
      VALUES (${id}, ${req.title}, ${req.version}, ${req.doc_type}, ${req.region || null}, ${req.platform || null}, ${req.tags || []}, ${s3Key}, ${now}, ${now})
    `;

    return {
      docId: id,
      uploadUrl,
      s3Key,
    };
  }
);
