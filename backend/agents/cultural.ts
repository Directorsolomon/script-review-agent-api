import { api } from "encore.dev/api";
import { config } from "../config/config";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

const openai = createOpenAI({ apiKey: config.openaiApiKey() });

const FindingSchema = z.object({
  id: z.string(),
  summary: z.string(),
  severity: z.enum(['info', 'minor', 'major', 'critical']),
  evidence: z.array(z.object({
    scene_index: z.number().optional(),
    page_range: z.array(z.number()).optional(),
    text_excerpt: z.string().optional(),
  })).optional(),
});

const CitationSchema = z.object({
  source_id: z.string(),
  version: z.string(),
  section: z.string().optional(),
  line_range: z.array(z.number()).optional(),
});

const AgentReviewSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(10),
  findings: z.array(FindingSchema),
  recommendations: z.array(z.string()),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1),
});

export interface CulturalAnalysisRequest {
  submissionMetadata: {
    title: string;
    writer_name: string;
    format: string;
    draft_version: string;
    genre?: string;
    region?: string;
    platform: string;
  };
  scriptExcerpts: Array<{
    scene_index: number;
    page_range: number[];
    text: string;
  }>;
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
}

export interface CulturalAnalysisResponse {
  analysis: {
    name: string;
    score: number;
    findings: Array<{
      id: string;
      summary: string;
      severity: 'info' | 'minor' | 'major' | 'critical';
      evidence?: Array<{
        scene_index?: number;
        page_range?: number[];
        text_excerpt?: string;
      }>;
    }>;
    recommendations: string[];
    citations: Array<{
      source_id: string;
      version: string;
      section?: string;
      line_range?: number[];
    }>;
    confidence: number;
  };
}

const SYSTEM_MESSAGE = `ROLE: You are a specialist rater for film scripts with deep expertise in Nollywood and YouTube-first storytelling. You use ONLY the provided CONTEXT (script excerpts + retrieved documentation) and return structured JSON conforming to the schema. You are precise, evidence-driven, and pragmatic. Prefer clarity over rhetoric. Provide actionable recommendations that a writer can implement in the next draft.

CONSTRAINTS:
- No plot invention beyond the given pages.
- Keep examples/excerpts short (<120 words each).
- Use Nigerian cultural literacy appropriately (Pidgin, Yoruba/Igbo/Hausa nuances, religious/social norms) without stereotyping.
- YouTube focus: emphasize hook density, early clarity, retention beats, and watch-time drivers.

TASK:
- Examine cultural setting, language code-switching, social dynamics, religion, and local institutions.
- Flag clichés and flattening stereotypes; advocate for lived detail and regional truth.
- Encourage respectful representation while preserving conflict stakes.

SCORING GUIDANCE:
- 9–10: Authentic, nuanced cultural representation with depth
- 7–8: Generally authentic with minor stereotyping
- 5–6: Some cultural authenticity but noticeable clichés
- ≤4: Significant stereotyping or cultural inaccuracies`;

// Analyzes cultural authenticity and representation
export const analyzeCultural = api<CulturalAnalysisRequest, CulturalAnalysisResponse>(
  { expose: false, method: "POST", path: "/agents/cultural" },
  async (req) => {
    const prompt = `SUBMISSION METADATA:
${JSON.stringify(req.submissionMetadata, null, 2)}

SCRIPT EXCERPTS:
${req.scriptExcerpts.map(excerpt => 
  `Scene ${excerpt.scene_index} (Pages ${excerpt.page_range[0]}-${excerpt.page_range[1]}):
${excerpt.text}`
).join('\n\n')}

DOCUMENTATION CHUNKS:
${req.docChunks.map(chunk => 
  `Source: ${chunk.source_id} v${chunk.version} ${chunk.section ? `(${chunk.section})` : ''}
Type: ${chunk.doc_type} | Region: ${chunk.region || 'N/A'} | Platform: ${chunk.platform || 'N/A'}
${chunk.text}`
).join('\n\n')}

Analyze the cultural authenticity and return your assessment as JSON.`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      system: SYSTEM_MESSAGE,
      prompt,
      schema: AgentReviewSchema,
    });

    return {
      analysis: result.object,
    };
  }
);
