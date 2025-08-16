import { api } from "encore.dev/api";
import { config } from "../config/config";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { FinalReport } from "../types/types";

const openai = createOpenAI({ apiKey: config.openaiApiKey() });

export interface SynthesizerRequest {
  submissionMetadata: {
    title: string;
    writer_name: string;
    format: string;
    draft_version: string;
    genre?: string;
    region?: string;
    platform: string;
  };
  finalReport: FinalReport;
}

export interface SynthesizerResponse {
  reportMarkdown: string;
  emailSubject: string;
  emailBody: string;
}

const SYSTEM_MESSAGE = `ROLE: You are a Report Synthesizer that creates writer-facing reports from technical assessments.

TASK:
Generate a writer-facing report with:
1) Executive Summary (≤6 bullets)
2) Strengths
3) Key Risks
4) Prioritized Action Plan (H/M/L with 1–2 line tests of success)
5) Detailed Notes by Bucket (with citations when available)
6) Appendix: metrics + methodology

STYLE:
- Professional, concise, supportive
- Nigeria + global audience appropriate
- Actionable and specific
- Encouraging while honest about areas for improvement`;

// Synthesizes final report into writer-facing format
export const synthesize = api<SynthesizerRequest, SynthesizerResponse>(
  { expose: false, method: "POST", path: "/agents/synthesize" },
  async (req) => {
    const reportPrompt = `SUBMISSION: "${req.submissionMetadata.title}" by ${req.submissionMetadata.writer_name}
Format: ${req.submissionMetadata.format} | Draft: ${req.submissionMetadata.draft_version}
Genre: ${req.submissionMetadata.genre || 'Not specified'} | Region: ${req.submissionMetadata.region || 'Not specified'}
Platform: ${req.submissionMetadata.platform}

FINAL REPORT DATA:
Overall Score: ${req.finalReport.overall_score}/10

Bucket Scores:
${req.finalReport.buckets.map(b => `- ${b.name}: ${b.score}/10`).join('\n')}

Highlights:
${req.finalReport.highlights.map(h => `- ${h}`).join('\n')}

Risks:
${req.finalReport.risks.map(r => `- ${r}`).join('\n')}

Action Plan:
${req.finalReport.action_plan.map(a => `- [${a.priority.toUpperCase()}] ${a.description} ${a.owner ? `(Owner: ${a.owner})` : ''}`).join('\n')}

Generate a comprehensive, writer-friendly report in Markdown format.`;

    const emailPrompt = `Create a polite email to ${req.submissionMetadata.writer_name} about their script "${req.submissionMetadata.title}".

Include:
- Greeting with name
- 2–3 headline takeaways from the review
- Next-step priorities
- Encouraging tone

Overall Score: ${req.finalReport.overall_score}/10
Top Highlights: ${req.finalReport.highlights.slice(0, 2).join(', ')}
Top Risks: ${req.finalReport.risks.slice(0, 2).join(', ')}

Generate both subject line and email body.`;

    const [reportResult, emailResult] = await Promise.all([
      generateText({
        model: openai("gpt-4o"),
        system: SYSTEM_MESSAGE,
        prompt: reportPrompt,
      }),
      generateText({
        model: openai("gpt-4o"),
        system: `You are drafting a professional email to a screenwriter about their script review.
TONE: human, encouraging, concrete.
FORMAT: Return as JSON with "subject" and "body" fields.`,
        prompt: emailPrompt,
      }),
    ]);

    // Parse email JSON response
    let emailData;
    try {
      emailData = JSON.parse(emailResult.text);
    } catch {
      emailData = {
        subject: `Script Review Complete: ${req.submissionMetadata.title}`,
        body: `Dear ${req.submissionMetadata.writer_name},\n\nYour script review is complete. Please see the attached report for detailed feedback.\n\nBest regards,\nThe Review Team`,
      };
    }

    return {
      reportMarkdown: reportResult.text,
      emailSubject: emailData.subject,
      emailBody: emailData.body,
    };
  }
);
