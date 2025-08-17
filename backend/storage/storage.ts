import { api, APIError } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";

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

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/x-fdx',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_SCRIPT_SIZE = 15 * 1024 * 1024; // 15MB for scripts (stricter limit)

function validateFile(filename: string, contentType: string, size: number, isScript: boolean = false): { valid: boolean; error?: string } {
  const maxSize = isScript ? MAX_SCRIPT_SIZE : MAX_FILE_SIZE;
  
  // Check file size
  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    const fileSizeMB = Math.round(size / 1024 / 1024 * 10) / 10;
    return {
      valid: false,
      error: `File too large: ${fileSizeMB}MB (maximum ${maxSizeMB}MB allowed)`,
    };
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: `Unsupported file type: ${contentType}. Please use PDF, DOCX, DOC, TXT, or FDX files.`,
    };
  }

  // Check filename for suspicious patterns
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.js$/i,
    /\.vbs$/i,
    /\.php$/i,
    /\.\./,
    /[<>:"|?*]/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filename)) {
      return {
        valid: false,
        error: "Filename contains invalid characters or suspicious extension",
      };
    }
  }

  return { valid: true };
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
    const validation = validateFile(req.filename, req.contentType, req.size, true);

    if (!validation.valid) {
      throw APIError.invalidArgument(validation.error || "File validation failed");
    }

    const s3Key = genS3Key("scripts", req.filename);
    
    try {
      const { url } = await scriptsBucket.signedUploadUrl(s3Key, { ttl: 300 });
      
      return {
        uploadUrl: url,
        s3Key,
      };
    } catch (error) {
      console.error("Failed to generate presigned URL:", error);
      throw APIError.internal("Failed to prepare file upload. Please try again.");
    }
  }
);

// Generates a presigned URL for document uploads with validation
export const presignDoc = api<PresignDocRequest, PresignResponse>(
  { expose: true, method: "POST", path: "/storage/presign/doc" },
  async (req) => {
    // Validate file before creating presigned URL
    const validation = validateFile(req.filename, req.contentType, req.size, false);

    if (!validation.valid) {
      throw APIError.invalidArgument(validation.error || "File validation failed");
    }

    const s3Key = genS3Key("docs", req.filename);
    
    try {
      const { url } = await docsBucket.signedUploadUrl(s3Key, { ttl: 300 });
      
      return {
        uploadUrl: url,
        s3Key,
      };
    } catch (error) {
      console.error("Failed to generate presigned URL:", error);
      throw APIError.internal("Failed to prepare file upload. Please try again.");
    }
  }
);
