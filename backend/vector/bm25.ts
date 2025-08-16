import { api } from "encore.dev/api";
import { db } from "../database/db";

export interface BM25SearchDocsRequest {
  keyword: string;
  filters: {
    doc_type?: string;
    region?: string;
    platform?: string;
  };
  k?: number;
}

export interface BM25SearchScriptRequest {
  keyword: string;
  submissionId: string;
  k?: number;
}

export interface BM25Result {
  id: string;
  text: string;
  rank: number;
  metadata: Record<string, any>;
}

export interface BM25SearchDocsResponse {
  results: BM25Result[];
}

export interface BM25SearchScriptResponse {
  results: BM25Result[];
}

// Performs BM25/full-text search on document chunks
export const searchDocsBM25 = api<BM25SearchDocsRequest, BM25SearchDocsResponse>(
  { expose: false, method: "POST", path: "/vector/bm25/docs" },
  async (req) => {
    const k = req.k || 12;
    
    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [req.keyword];
    
    if (req.filters.doc_type) {
      params.push(req.filters.doc_type);
      conditions.push(`d.doc_type = $${params.length}`);
    }
    
    if (req.filters.region) {
      params.push(req.filters.region);
      conditions.push(`COALESCE(d.region, '') = $${params.length}`);
    }
    
    if (req.filters.platform) {
      params.push(req.filters.platform);
      conditions.push(`COALESCE(d.platform, '') = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const results = await db.queryAll`
      SELECT c.id, c.doc_id, c.section, c.line_start, c.line_end, c.text,
             ts_rank_cd(c.tsv, plainto_tsquery($1)) AS rank
      FROM admin_doc_chunks c 
      JOIN docs d ON d.id = c.doc_id
      WHERE c.tsv @@ plainto_tsquery($1) ${whereClause}
      ORDER BY rank DESC
      LIMIT ${k}
    `;

    return {
      results: results.map(r => ({
        id: r.id,
        text: r.text,
        rank: r.rank,
        metadata: {
          doc_id: r.doc_id,
          section: r.section,
          line_start: r.line_start,
          line_end: r.line_end,
        },
      })),
    };
  }
);

// Performs BM25/full-text search on script chunks
export const searchScriptBM25 = api<BM25SearchScriptRequest, BM25SearchScriptResponse>(
  { expose: false, method: "POST", path: "/vector/bm25/script" },
  async (req) => {
    const k = req.k || 8;

    const results = await db.queryAll`
      SELECT id, submission_id, scene_index, page_start, page_end, text,
             ts_rank_cd(tsv, plainto_tsquery($1)) AS rank
      FROM script_chunks 
      WHERE submission_id = $2 AND tsv @@ plainto_tsquery($1)
      ORDER BY rank DESC
      LIMIT ${k}
    `;

    return {
      results: results.map(r => ({
        id: r.id,
        text: r.text,
        rank: r.rank,
        metadata: {
          submission_id: r.submission_id,
          scene_index: r.scene_index,
          page_start: r.page_start,
          page_end: r.page_end,
        },
      })),
    };
  }
);
