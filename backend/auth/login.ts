import { api, Cookie, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { verifyPassword, signJWT } from "./auth";
import { secret } from "encore.dev/config";

const jwtSecret = secret("JWTSecret");

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  session: Cookie<"session">;
}

// Logs in a user with email and password
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    if (!req.email || !req.password) {
      throw APIError.invalidArgument("Email and password are required");
    }

    const user = await db.queryRow`
      SELECT id, email, name, role, password_hash 
      FROM users 
      WHERE email = ${req.email.toLowerCase().trim()}
    `;

    if (!user) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    const isValidPassword = await verifyPassword(req.password, user.password_hash);
    if (!isValidPassword) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // Generate JWT token
    const token = signJWT({
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    }, jwtSecret());

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      session: {
        value: token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    };
  }
);
