import { api } from "encore.dev/api";

export interface ValidateFileRequest {
  filename: string;
  contentType: string;
  size: number;
}

export interface ValidateFileResponse {
  valid: boolean;
  error?: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/x-fdx',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Validates file uploads for security
export const validateFile = api<ValidateFileRequest, ValidateFileResponse>(
  { expose: false, method: "POST", path: "/security/validate-file" },
  async (req) => {
    // Check file size
    if (req.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large: ${Math.round(req.size / 1024 / 1024)}MB (max 20MB)`,
      };
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(req.contentType)) {
      return {
        valid: false,
        error: `Unsupported file type: ${req.contentType}`,
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
      if (pattern.test(req.filename)) {
        return {
          valid: false,
          error: "Filename contains invalid characters or suspicious extension",
        };
      }
    }

    return { valid: true };
  }
);
