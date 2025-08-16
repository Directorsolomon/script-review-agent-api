import { api } from "encore.dev/api";
import { db } from "../database/db";
import { vector } from "~encore/clients";

export type AgentName =
  | "structure" | "character" | "dialogue" | "pacing"
  | "market" | "cultural" | "platform" | "ethics";

export interface GetContextRequest {
  submissionId: string;
  agentName?: AgentName;
}

export interface GetContextResponse {
  docChunks: Array<{
    source_id: string;
    version: string;
    section?: string;
    line_range?: number[];
    text: string;
    doc_type: string;
    region?: string;
    platform?: string;
    priority_weight: number;
  }>;
  scriptSnippets: Array<{
    scene_index?: number;
    page_range?: number[];
    text: string;
  }>;
}

// Agent-specific document filters
const AGENT_PROFILES: Record<AgentName, { doc_type?: string; platform?: string; k: number }> = {
  structure: { doc_type: "rubric", platform: "YouTube", k: 10 },
  character: { doc_type: "style", k: 10 },
  dialogue: { doc_type: "style", k: 10 },
  pacing: { doc_type: "rubric", platform: "YouTube", k: 10 },
  market: { doc_type: "platform", platform: "YouTube", k: 8 },
  cultural: { doc_type: "style", k: 10 },
  platform: { doc_type: "platform", platform: "YouTube", k: 10 },
  ethics: { doc_type: "legal", k: 12 },
};

// Retrieves relevant context for a submission using hybrid search
export const getContext = api<GetContextRequest, GetContextResponse>(
  { expose: false, method: "POST", path: "/retrieval/context" },
  async (req) => {
    // Get submission details
    const submission = await db.queryRow`
      SELECT platform, region, format FROM submissions WHERE id = ${req.submissionId}
    `;

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Get agent profile or use default
    const agentName = req.agentName || "structure";
    const profile = AGENT_PROFILES[agentName];
    const query = `${agentName} analysis for ${submission.format} script`;

    // Perform hybrid search: vector + BM25
    const [vectorResults, bm25Results, scriptVectorResults, scriptBM25Results] = await Promise.all([
      // Vector search on documents
      vector.searchDocs({
        query,
        filters: {
          doc_type: profile.doc_type,
          platform: profile.platform || submission.platform,
          region: submission.region,
        },
        k: profile.k,
      }),
      
      // BM25 search on documents
      vector.searchDocsBM25({
        keyword: query,
        filters: {
          doc_type: profile.doc_type,
          platform: profile.platform || submission.platform,
          region: submission.region,
        },
        k: Math.ceil(profile.k / 2),
      }),
      
      // Vector search on script
      vector.searchScript({
        query,
        submissionId: req.submissionId,
        k: 6,
      }),
      
      // BM25 search on script
      vector.searchScriptBM25({
        keyword: query,
        submissionId: req.submissionId,
        k: 6,
      }),
    ]);

    // Merge and deduplicate document results
    const docResults = deduplicateResults([
      ...vectorResults.results.map(r => ({ ...r, type: 'vector' })),
      ...bm25Results.results.map(r => ({ ...r, type: 'bm25', score: r.rank })),
    ]).slice(0, profile.k);

    // Merge and deduplicate script results
    const scriptResults = deduplicateResults([
      ...scriptVectorResults.results.map(r => ({ ...r, type: 'vector' })),
      ...scriptBM25Results.results.map(r => ({ ...r, type: 'bm25', score: r.rank })),
    ]).slice(0, 8);

    // Get document metadata for chunks
    const docIds = [...new Set(docResults.map(r => r.metadata.doc_id))];
    const docs = await db.queryAll`
      SELECT id, version, doc_type, region, platform
      FROM docs
      WHERE id = ANY(${docIds})
    `;
    const docMap = new Map(docs.map(d => [d.id, d]));

    // Format response
    const docChunks = docResults.map(result => {
      const doc = docMap.get(result.metadata.doc_id);
      return {
        source_id: result.metadata.doc_id,
        version: doc?.version || "unknown",
        section: result.metadata.section,
        line_range: result.metadata.line_start && result.metadata.line_end 
          ? [result.metadata.line_start, result.metadata.line_end]
          : undefined,
        text: result.text,
        doc_type: doc?.doc_type || "unknown",
        region: doc?.region,
        platform: doc?.platform,
        priority_weight: result.score || 1.0,
      };
    });

    const scriptSnippets = scriptResults.map(result => ({
      scene_index: result.metadata.scene_index,
      page_range: result.metadata.page_start && result.metadata.page_end
        ? [result.metadata.page_start, result.metadata.page_end]
        : undefined,
      text: result.text,
    }));

    return {
      docChunks,
      scriptSnippets,
    };
  }
);

function deduplicateResults(results: Array<{ id: string; score: number; [key: string]: any }>): Array<{ id: string; score: number; [key: string]: any }> {
  const seen = new Set<string>();
  const deduplicated: Array<{ id: string; score: number; [key: string]: any }> = [];
  
  for (const result of results) {
    if (!seen.has(result.id)) {
      seen.add(result.id);
      deduplicated.push(result);
    }
  }
  
  // Sort by score descending
  return deduplicated.sort((a, b) => (b.score || 0) - (a.score || 0));
}
