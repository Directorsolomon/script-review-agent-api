import { api } from "encore.dev/api";
import { config } from "../config/config";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { AgentReview, FinalReport } from "../types/types";

const openai = createOpenAI({ apiKey: config.openaiApiKey() });

const BucketScoreSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(10),
});

const ActionItemSchema = z.object({
  description: z.string(),
  priority: z.enum(['high', 'med', 'low']),
  owner: z.string().optional(),
});

const ReferenceSchema = z.object({
  source_id: z.string(),
  version: z.string(),
  section: z.string().optional(),
  line_range: z.array(z.number()).optional(),
});

const FinalReportSchema = z.object({
  submission_id: z.string(),
  overall_score: z.number().min(0).max(10),
  buckets: z.array(BucketScoreSchema),
  highlights: z.array(z.string()),
  risks: z.array(z.string()),
  action_plan: z.array(ActionItemSchema),
  references: z.array(ReferenceSchema),
});

export interface JudgeRequest {
  submissionId: string;
  agentOutputs: AgentReview[];
  rubricWeights: Record<string, number>;
}

export interface JudgeResponse {
  finalReport: FinalReport;
}

const SYSTEM_MESSAGE = `ROLE: You are the Judge & Calibrator for a script review system. You normalize scores, detect contradictions, and produce final assessments that are fair, actionable, and consistent.

TASK:
- Normalize scores across agents; detect contradictions and soft reconciliation where needed.
- Produce final bucket scores + overall score. If any ETHICS finding is critical, cap overall at 5.9 unless resolved.
- Summarize top 6 insights across agents (balanced strengths/risks).

CONFLICT RESOLUTION GUIDANCE:
- If Structure=high and Pacing=low, prioritize Pacing fixes that preserve beat logic.
- If Dialogue=high but Cultural=low, propose line-level cultural adjustment without flattening voice.

CONSTRAINTS:
- Be precise and evidence-driven
- Provide actionable recommendations
- Balance strengths and areas for improvement
- Ensure consistency across all assessments`;

// Judges and calibrates all agent outputs into final report
export const judge = api<JudgeRequest, JudgeResponse>(
  { expose: false, method: "POST", path: "/agents/judge" },
  async (req) => {
    const prompt = `SUBMISSION ID: ${req.submissionId}

RUBRIC WEIGHTS:
${JSON.stringify(req.rubricWeights, null, 2)}

AGENT OUTPUTS:
${req.agentOutputs.map(output => 
  `${output.name.toUpperCase()} (Score: ${output.score}, Confidence: ${output.confidence})
Findings: ${output.findings.map(f => `${f.severity}: ${f.summary}`).join('; ')}
Recommendations: ${output.recommendations.join('; ')}
Citations: ${output.citations.length} references
`
).join('\n\n')}

Analyze all agent outputs, resolve conflicts, normalize scores, and produce a final calibrated report as JSON.`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      system: SYSTEM_MESSAGE,
      prompt,
      schema: FinalReportSchema,
    });

    return {
      finalReport: {
        ...result.object,
        delivery: {
          pdf_uri: null,
          html_uri: null,
        },
      },
    };
  }
);
