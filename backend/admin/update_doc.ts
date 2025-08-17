import { api, APIError } from "encore.dev/api";
import { db } from "../database/db";
import { getAuthData } from "~encore/auth";
import type { DocType, Region, Platform } from "../types/types";

export interface UpdateDocRequest {
  id: string;
  title?: string;
  version?: string;
  doc_type?: DocType;
  region?: Region;
  platform?: Platform;
  tags?: string[];
  status?: 'active' | 'inactive' | 'experimental';
}

export interface UpdateDocResponse {
  ok: boolean;
}

// Updates an admin document's metadata with auth check
export const updateDoc = api<UpdateDocRequest, UpdateDocResponse>(
  { auth: true, expose: true, method: "PATCH", path: "/admin/docs/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!['admin', 'editor'].includes(auth.role)) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    // Check if document exists
    const doc = await db.queryRow`
      SELECT id FROM docs WHERE id = ${req.id}
    `;

    if (!doc) {
      throw APIError.notFound("Document not found");
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(req.title);
    }

    if (req.version !== undefined) {
      updates.push(`version = $${paramIndex++}`);
      params.push(req.version);
    }

    if (req.doc_type !== undefined) {
      updates.push(`doc_type = $${paramIndex++}`);
      params.push(req.doc_type);
    }

    if (req.region !== undefined) {
      updates.push(`region = $${paramIndex++}`);
      params.push(req.region);
    }

    if (req.platform !== undefined) {
      updates.push(`platform = $${paramIndex++}`);
      params.push(req.platform);
    }

    if (req.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(req.tags);
    }

    if (req.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(req.status);
    }

    if (updates.length === 0) {
      return { ok: true }; // No updates to make
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().toISOString());

    // Add the ID for the WHERE clause
    params.push(req.id);

    const query = `
      UPDATE docs 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await db.rawExec(query, params);

    return { ok: true };
  }
);
