import { api } from "encore.dev/api";
import { db } from "../database/db";
import { hashPassword } from "./auth";

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  userId: string;
}

// Registers a new user (public users only, admins created separately)
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    // Check if user already exists
    const existing = await db.queryRow`
      SELECT id FROM users WHERE email = ${req.email}
    `;

    if (existing) {
      throw new Error("User already exists");
    }

    // Validate password strength
    if (req.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(req.password);
    const now = new Date().toISOString();

    await db.exec`
      INSERT INTO users (id, email, name, password_hash, role, created_at)
      VALUES (${id}, ${req.email}, ${req.name}, ${passwordHash}, ${'user'}, ${now})
    `;

    return { userId: id };
  }
);
