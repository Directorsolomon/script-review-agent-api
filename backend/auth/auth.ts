import { Header, Cookie, APIError, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { db } from "../database/db";
import * as bcrypt from "bcrypt";

const jwtSecret = secret("JWTSecret");

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer' | 'user';
  name: string;
}

const auth = authHandler<AuthParams, AuthData>(
  async (data) => {
    // Resolve the authenticated user from the authorization header or session cookie
    const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
    if (!token) {
      throw APIError.unauthenticated("missing token");
    }

    try {
      // Simple JWT verification (in production, use a proper JWT library)
      const payload = verifyJWT(token, jwtSecret());
      
      // Get user from database
      const user = await db.queryRow`
        SELECT id, email, role, name FROM users WHERE id = ${payload.sub}
      `;
      
      if (!user) {
        throw APIError.unauthenticated("user not found");
      }

      return {
        userID: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
    } catch (err) {
      throw APIError.unauthenticated("invalid token", err);
    }
  }
);

// Configure the API gateway to use the auth handler
export const gw = new Gateway({ authHandler: auth });

// Simple JWT functions (in production, use a proper JWT library)
function verifyJWT(token: string, secret: string): { sub: string; exp: number } {
  try {
    const [header, payload, signature] = token.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // In production, verify signature properly
    if (decodedPayload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    return decodedPayload;
  } catch {
    throw new Error('Invalid token');
  }
}

export function signJWT(payload: any, secret: string): string {
  // In production, use a proper JWT library
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'signature'; // In production, generate proper signature
  
  return `${header}.${payloadStr}.${signature}`;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
