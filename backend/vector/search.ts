import { api } from "encore.dev/api";
import { db } from "../database/db";
import { embeddings } from "~encore/clients";
import { searchDocsBM25, searchScriptBM25 } from "./bm25";

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

// Check if vector type is available
async function isVectorAvailable(): Promise<boolean> {
  try {
    const result = await db.queryRow`
      SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') as available
    `;
    return result?.available || false;
  } catch {
    return false;
  }
}

// Performs vector search on document chunks
export const searchDocs = api<SearchDocsRequest, SearchDocsResponse>(
  { expose: false, method: "POST", path: "/vector/search/docs" },
  async (req) => {
    const k = req.k || 12;
    const vectorAvailable = await isVectorAvailable();
    
    if (!vectorAvailable) {
      // Fallback to text-based search when vector is not available
      console.log("Vector search not available, falling back to text search");
      return await fallbackTextSearchDocs(req);
    }
    
    try {
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
        conditions.push(`(d.region = $${params.length} OR d.region IS NULL)`);
      }
      
      if (req.filters.platform) {
        params.push(req.filters.platform);
        conditions.push(`(d.platform = $${params.length} OR d.platform IS NULL)`);
      }
      
      if (req.filters.doc_id) {
        params.push(req.filters.doc_id);
        conditions.push(`c.doc_id = $${params.length}`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Use raw SQL for complex vector operations
      const query = `
        SELECT c.id, c.doc_id, c.section, c.line_start, c.line_end, c.text,
               1 - (c.embedding::vector <=> $1::vector) AS score
        FROM admin_doc_chunks c
        JOIN docs d ON d.id = c.doc_id
        ${whereClause}
        ORDER BY c.embedding::vector <=> $1::vector
        LIMIT $${params.length + 1}
      `;
      
      params.push(k);
      const results = await db.rawQueryAll(query, params);

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
    } catch (error) {
      console.error("Vector search failed, falling back to text search:", error);
      return await fallbackTextSearchDocs(req);
    }
  }
);

// Performs vector search on script chunks
export const searchScript = api<SearchScriptRequest, SearchScriptResponse>(
  { expose: false, method: "POST", path: "/vector/search/script" },
  async (req) => {
    const k = req.k || 8;
    const vectorAvailable = await isVectorAvailable();
    
    if (!vectorAvailable) {
      // Fallback to text-based search when vector is not available
      console.log("Vector search not available, falling back to text search");
      return await fallbackTextSearchScript(req);
    }
    
    try {
      // Generate embedding for query
      const { embeddings: queryEmbeddings } = await embeddings.generateEmbeddings({
        texts: [req.query],
      });
      const queryEmbedding = queryEmbeddings[0];

      const results = await db.rawQueryAll(`
        SELECT id, submission_id, scene_index, page_start, page_end, text,
               1 - (embedding::vector <=> $1::vector) AS score
        FROM script_chunks 
        WHERE submission_id = $2
        ORDER BY embedding::vector <=> $1::vector
        LIMIT $3
      `, [JSON.stringify(queryEmbedding), req.submissionId, k]);

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
    } catch (error) {
      console.error("Vector search failed, falling back to text search:", error);
      return await fallbackTextSearchScript(req);
    }
  }
);

// Fallback text search for documents - uses BM25 API to avoid code duplication
async function fallbackTextSearchDocs(req: SearchDocsRequest): Promise<SearchDocsResponse> {
  const k = req.k || 12;

  // Call the BM25 search function directly
  const bm25Response = await searchDocsBM25({
    keyword: req.query,
    filters: {
      doc_type: req.filters.doc_type,
      region: req.filters.region,
      platform: req.filters.platform,
    },
    k,
  });

  // Convert BM25 results to SearchResult format (rank -> score)
  return {
    results: bm25Response.results.map(r => ({
      id: r.id,
      text: r.text,
      score: r.rank, // BM25 uses 'rank', vector search uses 'score'
      metadata: r.metadata,
    })),
  };
}

// Fallback text search for scripts - uses BM25 API to avoid code duplication
async function fallbackTextSearchScript(req: SearchScriptRequest): Promise<SearchScriptResponse> {
  const k = req.k || 8;

  // Call the BM25 search function directly
  const bm25Response = await searchScriptBM25({
    keyword: req.query,
    submissionId: req.submissionId,
    k,
  });

  // Convert BM25 results to SearchResult format (rank -> score)
  return {
    results: bm25Response.results.map(r => ({
      id: r.id,
      text: r.text,
      score: r.rank, // BM25 uses 'rank', vector search uses 'score'
      metadata: r.metadata,
    })),
  };
}
