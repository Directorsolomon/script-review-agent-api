import { api } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";
import { security } from "~encore/clients";

// Define buckets at module level
const scriptsBucket = new Bucket("scripts");
const docsBucket = new Bucket("docs");

export interface PresignScriptRequest {
  filename: string;
  contentType: string;
  size: number;
}

export interface PresignDocRequest {
  filename: string;
  contentType: string;
  size: number;
}

export interface PresignResponse {
  uploadUrl: string;
  s3Key: string;
}

function genS3Key(prefix: string, filename: string): string {
  const id = crypto.randomUUID();
  const safe = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `${prefix}/${id}__${safe}`;
}

// Generates a presigned URL for script uploads with validation
export const presignScript = api<PresignScriptRequest, PresignResponse>(
  { expose: true, method: "POST", path: "/storage/presign/script" },
  async (req) => {
    // Validate file before creating presigned URL
    const validation = await security.validateFile({
      filename: req.filename,
      contentType: req.contentType,
      size: req.size,
    });

    if (!validation.valid) {
      throw new Error(validation.error || "File validation failed");
    }

    const s3Key = genS3Key("scripts", req.filename);
    const { url } = await scriptsBucket.signedUploadUrl(s3Key, { ttl: 300 });
    
    return {
      uploadUrl: url,
      s3Key,
    };
  }
);

// Generates a presigned URL for document uploads with validation
export const presignDoc = api<PresignDocRequest, PresignResponse>(
  { expose: true, method: "POST", path: "/storage/presign/doc" },
  async (req) => {
    // Validate file before creating presigned URL
    const validation = await security.validateFile({
      filename: req.filename,
      contentType: req.contentType,
      size: req.size,
    });

    if (!validation.valid) {
      throw new Error(validation.error || "File validation failed");
    }

    const s3Key = genS3Key("docs", req.filename);
    const { url } = await docsBucket.signedUploadUrl(s3Key, { ttl: 300 });
    
    return {
      uploadUrl: url,
      s3Key,
    };
  }
);
