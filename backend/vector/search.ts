import { api } from "encore.dev/api";
import { db } from "../database/db";
import { embeddings } from "~encore/clients";

export interface SearchFilters {
  doc_type?: string;
  region?: string;
  platform?: string;
  doc_id?: string;
  submission_id?: string;
}

export interface SearchDocsRequest {
  query: string;
  filters: SearchFilters;
  k?: number;
}

export interface SearchScriptRequest {
  query: string;
  submissionId: string;
  k?: number;
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, any>;
}

export interface SearchDocsResponse {
  results: SearchResult[];
}

export interface SearchScriptResponse {
  results: SearchResult[];
}

// Performs vector search on document chunks
export const searchDocs = api<SearchDocsRequest, SearchDocsResponse>(
  { expose: false, method: "POST", path: "/vector/search/docs" },
  async (req) => {
    const k = req.k || 12;
    
    // Generate embedding for query
    const { embeddings: queryEmbeddings } = await embeddings.generateEmbeddings({
      texts: [req.query],
    });
    const queryEmbedding = queryEmbeddings[0];

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [JSON.stringify(queryEmbedding)];
    
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
    
    if (req.filters.doc_id) {
      params.push(req.filters.doc_id);
      conditions.push(`c.doc_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const results = await db.queryAll`
      SELECT c.id, c.doc_id, c.section, c.line_start, c.line_end, c.text,
             1 - (c.embedding::vector <=> $1::vector) AS score
      FROM admin_doc_chunks c
      JOIN docs d ON d.id = c.doc_id
      ${whereClause}
      ORDER BY c.embedding::vector <=> $1::vector
      LIMIT ${k}
    `;

    return {
      results: results.map(r => ({
        id: r.id,
        text: r.text,
        score: r.score,
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

// Performs vector search on script chunks
export const searchScript = api<SearchScriptRequest, SearchScriptResponse>(
  { expose: false, method: "POST", path: "/vector/search/script" },
  async (req) => {
    const k = req.k || 8;
    
    // Generate embedding for query
    const { embeddings: queryEmbeddings } = await embeddings.generateEmbeddings({
      texts: [req.query],
    });
    const queryEmbedding = queryEmbeddings[0];

    const results = await db.queryAll`
      SELECT id, submission_id, scene_index, page_start, page_end, text,
             1 - (embedding::vector <=> $1::vector) AS score
      FROM script_chunks 
      WHERE submission_id = $2
      ORDER BY embedding::vector <=> $1::vector
      LIMIT ${k}
    `;

    return {
      results: results.map(r => ({
        id: r.id,
        text: r.text,
        score: r.score,
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
