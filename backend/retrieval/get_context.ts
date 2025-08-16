import { api } from "encore.dev/api";
import { db } from "../database/db";

export interface GetContextRequest {
  submissionId: string;
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
  scriptSnippets: any[];
}

// Retrieves relevant context for a submission
export const getContext = api<GetContextRequest, GetContextResponse>(
  { expose: false, method: "POST", path: "/retrieval/context" },
  async (req) => {
    // Get submission details to filter relevant docs
    const submission = await db.queryRow`
      SELECT platform, region, format FROM submissions WHERE id = ${req.submissionId}
    `;

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Retrieve relevant active documents
    // Priority: exact platform/region match > platform match > general docs
    const docs = await db.queryAll`
      SELECT id, title, version, doc_type, region, platform, s3_key
      FROM docs 
      WHERE status = 'active'
      AND (
        (platform = ${submission.platform} AND region = ${submission.region}) OR
        (platform = ${submission.platform} AND region IS NULL) OR
        (platform IS NULL AND region = ${submission.region}) OR
        (platform IS NULL AND region IS NULL)
      )
      ORDER BY 
        CASE 
          WHEN platform = ${submission.platform} AND region = ${submission.region} THEN 1
          WHEN platform = ${submission.platform} AND region IS NULL THEN 2
          WHEN platform IS NULL AND region = ${submission.region} THEN 3
          ELSE 4
        END,
        doc_type,
        created_at DESC
    `;

    // TODO: Implement actual document retrieval and chunking
    // For now, return mock chunks based on retrieved docs
    const docChunks = docs.map((doc, index) => ({
      source_id: doc.id,
      version: doc.version,
      section: `Section ${index + 1}`,
      line_range: [1, 50],
      text: `Mock content from ${doc.title} (${doc.doc_type}). This would contain actual document content retrieved from S3 and processed into chunks.`,
      doc_type: doc.doc_type,
      region: doc.region,
      platform: doc.platform,
      priority_weight: index === 0 ? 1.0 : 0.8 - (index * 0.1),
    }));

    return {
      docChunks,
      scriptSnippets: [], // TODO: Implement script snippet extraction
    };
  }
);
