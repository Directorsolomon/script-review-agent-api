import { api, Header } from "encore.dev/api";
import { db } from "../database/db";
import { getAuthData } from "~encore/auth";

export interface GenerateCSRFTokenResponse {
  token: string;
}

export interface ValidateCSRFTokenRequest {
  token: Header<"X-CSRF-Token">;
}

// Generates a CSRF token for the authenticated user
export const generateCSRFToken = api<void, GenerateCSRFTokenResponse>(
  { auth: true, expose: true, method: "POST", path: "/security/csrf/generate" },
  async () => {
    const auth = getAuthData()!;
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.exec`
      INSERT INTO csrf_tokens (token, user_id, expires_at)
      VALUES (${token}, ${auth.userID}, ${expiresAt.toISOString()})
    `;

    return { token };
  }
);

// Validates a CSRF token
export const validateCSRFToken = api<ValidateCSRFTokenRequest, void>(
  { auth: true, expose: false, method: "POST", path: "/security/csrf/validate" },
  async (req) => {
    const auth = getAuthData()!;
    
    const tokenRecord = await db.queryRow`
      SELECT token FROM csrf_tokens
      WHERE token = ${req.token} 
      AND user_id = ${auth.userID}
      AND expires_at > NOW()
    `;

    if (!tokenRecord) {
      throw new Error("Invalid or expired CSRF token");
    }

    // Clean up used token
    await db.exec`
      DELETE FROM csrf_tokens 
      WHERE token = ${req.token}
    `;
  }
);

// Clean up expired CSRF tokens (called by cleanup service)
export const cleanupExpiredTokens = api<void, void>(
  { expose: false, method: "POST", path: "/security/csrf/cleanup" },
  async () => {
    await db.exec`
      DELETE FROM csrf_tokens 
      WHERE expires_at < NOW()
    `;
  }
);
