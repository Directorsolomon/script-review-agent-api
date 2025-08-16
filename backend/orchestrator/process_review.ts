import { api } from "encore.dev/api";
import { db } from "../database/db";
import { retrieval, agents } from "~encore/clients";
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
    const submission = await db.queryRow`
      SELECT id, writer_name, script_title, platform, format, draft_version, genre, region FROM submissions WHERE id = ${req.submissionId}
    `;

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Update submission status to processing
    await db.exec`
      UPDATE submissions 
      SET status = 'processing' 
      WHERE id = ${req.submissionId}
    `;

    try {
      // 1. Retrieve relevant context
      const contextResponse = await retrieval.getContext({ submissionId: req.submissionId });

      // Prepare submission metadata for agents
      const submissionMetadata = {
        title: submission.script_title,
        writer_name: submission.writer_name,
        format: submission.format,
        draft_version: submission.draft_version,
        genre: submission.genre,
        region: submission.region,
        platform: submission.platform || 'YouTube',
      };

      // Mock script excerpts for now (TODO: implement actual script parsing)
      const scriptExcerpts = [
        {
          scene_index: 1,
          page_range: [1, 3],
          text: "FADE IN: EXT. LAGOS STREET - DAY\n\nBusy street scene with vendors and traffic. ADUNNI (25), determined young woman, walks purposefully through the crowd...",
        },
        {
          scene_index: 5,
          page_range: [12, 15],
          text: "INT. FAMILY COMPOUND - NIGHT\n\nAdunni confronts her father about the arranged marriage. Tension builds as traditional values clash with modern aspirations...",
        },
      ];

      // 2. Run all specialist agents in parallel
      const agentRequests = {
        structure: {
          submissionMetadata,
          scriptExcerpts,
          docChunks: contextResponse.docChunks,
        },
        character: {
          submissionMetadata,
          scriptExcerpts,
          docChunks: contextResponse.docChunks,
        },
        dialogue: {
          submissionMetadata,
          scriptExcerpts,
          docChunks: contextResponse.docChunks,
        },
        pacing: {
          submissionMetadata,
          scriptExcerpts,
          docChunks: contextResponse.docChunks,
        },
        market: {
          submissionMetadata,
          scriptExcerpts,
          docChunks: contextResponse.docChunks,
        },
        cultural: {
          submissionMetadata,
          scriptExcerpts,
          docChunks: contextResponse.docChunks,
        },
        platform: {
          submissionMetadata,
          scriptExcerpts,
          docChunks: contextResponse.docChunks,
        },
        ethics: {
          submissionMetadata,
          scriptExcerpts,
          docChunks: contextResponse.docChunks,
        },
      };

      const [
        structureResult,
        characterResult,
        dialogueResult,
        pacingResult,
        marketResult,
        culturalResult,
        platformResult,
        ethicsResult,
      ] = await Promise.all([
        agents.analyzeStructure(agentRequests.structure),
        agents.analyzeCharacter(agentRequests.character),
        agents.analyzeDialogue(agentRequests.dialogue),
        agents.analyzePacing(agentRequests.pacing),
        agents.analyzeMarket(agentRequests.market),
        agents.analyzeCultural(agentRequests.cultural),
        agents.analyzePlatform(agentRequests.platform),
        agents.analyzeEthics(agentRequests.ethics),
      ]);

      // 3. Collect all agent outputs
      const agentOutputs: AgentReview[] = [
        structureResult.analysis,
        characterResult.analysis,
        dialogueResult.analysis,
        pacingResult.analysis,
        marketResult.analysis,
        culturalResult.analysis,
        platformResult.analysis,
        ethicsResult.analysis,
      ];

      // 4. Run judge to calibrate and produce final scores
      const judgeResult = await agents.judge({
        submissionId: req.submissionId,
        agentOutputs,
        rubricWeights: DEFAULT_RUBRIC_WEIGHTS,
      });

      // 5. Synthesize final report
      const synthesizerResult = await agents.synthesize({
        submissionMetadata,
        finalReport: judgeResult.finalReport,
      });

      // 6. Store the complete report
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
