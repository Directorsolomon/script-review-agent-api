import { api } from "encore.dev/api";
import { storage } from "~encore/clients";

export interface PresignScriptRequest {
  filename: string;
  contentType: string;
}

export interface PresignScriptResponse {
  uploadUrl: string;
  s3Key: string;
}

// Creates a presigned URL for script uploads
export const presignScript = api<PresignScriptRequest, PresignScriptResponse>(
  { expose: true, method: "POST", path: "/submissions/presign" },
  async (req) => {
    const { uploadUrl, s3Key } = await storage.presignScript({
      filename: req.filename,
      contentType: req.contentType,
    });

    return {
      uploadUrl,
      s3Key,
    };
  }
);
