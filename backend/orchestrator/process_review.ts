import { api } from "encore.dev/api";
import { db } from "../database/db";
import { retrieval, agents, embeddings } from "~encore/clients";
import type { FinalReport, AgentReview } from "../types/types";

export interface ProcessReviewRequest {
  submissionId: string;
}

export interface ProcessReviewResponse {
  ok: boolean;
}

// Default rubric weights for scoring
const DEFAULT_RUBRIC_WEIGHTS = {
  structure: 0.15,
  character: 0.15,
  dialogue: 0.12,
  pacing: 0.13,
  market: 0.12,
  cultural: 0.13,
  platform: 0.12,
  ethics: 0.08,
};

// Orchestrates the complete review process for a submission
export const processReview = api<ProcessReviewRequest, ProcessReviewResponse>(
  { expose: false, method: "POST", path: "/orchestrator/process" },
  async (req) => {
    // Validate input - only accept submission ID, no large payloads
    if (!req.submissionId || typeof req.submissionId !== 'string') {
      throw new Error("Invalid submission ID");
    }

    const submission = await db.queryRow`
      SELECT id, writer_name, script_title, platform, format, draft_version, genre, region, file_s3_key 
      FROM submissions 
      WHERE id = ${req.submissionId}
    `;

    if (!submission) {
      throw new Error("Submission not found");
    }

    if (!submission.file_s3_key) {
      throw new Error("No script file found for submission");
    }

    // Update submission status to processing
    await db.exec`
      UPDATE submissions 
      SET status = 'processing' 
      WHERE id = ${req.submissionId}
    `;

    try {
      // Process script embeddings from S3 - this should be the only place large content is handled
      await embeddings.processScript({
        submissionId: req.submissionId,
        s3Key: submission.file_s3_key,
      });

      // Prepare submission metadata for agents - only metadata, no large content
      const submissionMetadata = {
        title: submission.script_title,
        writer_name: submission.writer_name,
        format: submission.format,
        draft_version: submission.draft_version,
        genre: submission.genre,
        region: submission.region,
        platform: submission.platform || 'YouTube',
      };

      // Run all specialist agents in parallel with agent-specific context
      const agentNames = ['structure', 'character', 'dialogue', 'pacing', 'market', 'cultural', 'platform', 'ethics'] as const;
      
      const agentResults = await Promise.all(
        agentNames.map(async (agentName) => {
          try {
            // Get agent-specific context - this fetches relevant chunks, not full content
            const contextResponse = await retrieval.getContext({
              submissionId: req.submissionId,
              agentName,
            });

            // Call the appropriate agent with only relevant excerpts
            switch (agentName) {
              case 'structure':
                return agents.analyzeStructure({
                  submissionMetadata,
                  scriptExcerpts: contextResponse.scriptSnippets,
                  docChunks: contextResponse.docChunks,
                });
              case 'character':
                return agents.analyzeCharacter({
                  submissionMetadata,
                  scriptExcerpts: contextResponse.scriptSnippets,
                  docChunks: contextResponse.docChunks,
                });
              case 'dialogue':
                return agents.analyzeDialogue({
                  submissionMetadata,
                  scriptExcerpts: contextResponse.scriptSnippets,
                  docChunks: contextResponse.docChunks,
                });
              case 'pacing':
                return agents.analyzePacing({
                  submissionMetadata,
                  scriptExcerpts: contextResponse.scriptSnippets,
                  docChunks: contextResponse.docChunks,
                });
              case 'market':
                return agents.analyzeMarket({
                  submissionMetadata,
                  scriptExcerpts: contextResponse.scriptSnippets,
                  docChunks: contextResponse.docChunks,
                });
              case 'cultural':
                return agents.analyzeCultural({
                  submissionMetadata,
                  scriptExcerpts: contextResponse.scriptSnippets,
                  docChunks: contextResponse.docChunks,
                });
              case 'platform':
                return agents.analyzePlatform({
                  submissionMetadata,
                  scriptExcerpts: contextResponse.scriptSnippets,
                  docChunks: contextResponse.docChunks,
                });
              case 'ethics':
                return agents.analyzeEthics({
                  submissionMetadata,
                  scriptExcerpts: contextResponse.scriptSnippets,
                  docChunks: contextResponse.docChunks,
                });
              default:
                throw new Error(`Unknown agent: ${agentName}`);
            }
          } catch (error) {
            console.error(`Agent ${agentName} failed:`, error);
            // Return a fallback analysis to prevent the entire process from failing
            return {
              analysis: {
                name: agentName,
                score: 5.0,
                findings: [{
                  id: `${agentName}-error`,
                  summary: `Analysis temporarily unavailable for ${agentName}`,
                  severity: 'info' as const,
                  evidence: []
                }],
                recommendations: [`Please retry analysis for ${agentName} component`],
                citations: [],
                confidence: 0.1,
              }
            };
          }
        })
      );

      // Collect all agent outputs
      const agentOutputs: AgentReview[] = agentResults.map(result => result.analysis);

      // Run judge to calibrate and produce final scores
      const judgeResult = await agents.judge({
        submissionId: req.submissionId,
        agentOutputs,
        rubricWeights: DEFAULT_RUBRIC_WEIGHTS,
      });

      // Synthesize final report
      const synthesizerResult = await agents.synthesize({
        submissionMetadata,
        finalReport: judgeResult.finalReport,
      });

      // Store the complete report
      const finalReport: FinalReport = {
        ...judgeResult.finalReport,
        delivery: {
          pdf_uri: null, // TODO: Generate PDF
          html_uri: null, // TODO: Generate HTML
        },
      };

      const now = new Date().toISOString();
      await db.exec`
        INSERT INTO reports (submission_id, overall_score, report_json, created_at, updated_at)
        VALUES (${req.submissionId}, ${finalReport.overall_score}, ${JSON.stringify({
          ...finalReport,
          report_markdown: synthesizerResult.reportMarkdown,
          email_subject: synthesizerResult.emailSubject,
          email_body: synthesizerResult.emailBody,
        })}, ${now}, ${now})
        ON CONFLICT (submission_id) 
        DO UPDATE SET 
          overall_score = EXCLUDED.overall_score,
          report_json = EXCLUDED.report_json,
          updated_at = EXCLUDED.updated_at
      `;

      // Update submission status to completed
      await db.exec`
        UPDATE submissions 
        SET status = 'completed' 
        WHERE id = ${req.submissionId}
      `;

    } catch (error) {
      console.error(`Failed to process review for submission ${req.submissionId}:`, error);
      
      // Update submission status to failed
      await db.exec`
        UPDATE submissions 
        SET status = 'failed' 
        WHERE id = ${req.submissionId}
      `;
      throw error;
    }

    return { ok: true };
  }
);
