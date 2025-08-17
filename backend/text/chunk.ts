import { api, APIError } from "encore.dev/api";

export interface ChunkTextRequest {
  text: string;
  maxTokens?: number;
  overlap?: number;
}

export interface TextChunk {
  text: string;
  section?: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface ChunkTextResponse {
  chunks: TextChunk[];
}

const DEFAULT_MAX_TOKENS = 800;
const DEFAULT_OVERLAP = 120;
const MAX_INPUT_LENGTH = 200000; // Maximum input text length (characters)

// Chunks text into smaller segments for embedding
export const chunkText = api<ChunkTextRequest, ChunkTextResponse>(
  { expose: false, method: "POST", path: "/text/chunk" },
  async (req) => {
    // Validate input size
    if (!req.text || typeof req.text !== 'string') {
      throw APIError.invalidArgument("Text input is required and must be a string");
    }
    
    if (req.text.length > MAX_INPUT_LENGTH) {
      const lengthMB = Math.round(req.text.length / 1024 / 1024 * 10) / 10;
      const maxMB = Math.round(MAX_INPUT_LENGTH / 1024 / 1024 * 10) / 10;
      throw APIError.invalidArgument(`Text too long: ${lengthMB}MB (maximum ${maxMB}MB)`);
    }
    
    const maxTokens = req.maxTokens || DEFAULT_MAX_TOKENS;
    const overlap = req.overlap || DEFAULT_OVERLAP;
    
    // Validate parameters
    if (maxTokens < 100 || maxTokens > 2000) {
      throw APIError.invalidArgument("maxTokens must be between 100 and 2000");
    }
    
    if (overlap < 0 || overlap >= maxTokens) {
      throw APIError.invalidArgument("overlap must be between 0 and maxTokens");
    }
    
    try {
      const chunks = chunkByHeadingsAndWindow(req.text, maxTokens, overlap);
      
      if (chunks.length === 0) {
        throw APIError.invalidArgument("No valid chunks could be created from the text");
      }
      
      // Limit number of chunks to prevent memory issues
      const maxChunks = 500;
      if (chunks.length > maxChunks) {
        console.warn(`Too many chunks (${chunks.length}), limiting to ${maxChunks}`);
        return { chunks: chunks.slice(0, maxChunks) };
      }
      
      return { chunks };
    } catch (error) {
      console.error("Text chunking failed:", error);
      throw APIError.internal("Failed to process text into chunks");
    }
  }
);

function roughTokenCount(text: string): number {
  return Math.ceil(text.length / 4); // Rough heuristic: 4 chars per token
}

function chunkByHeadingsAndWindow(text: string, maxTokens: number, overlap: number): TextChunk[] {
  const lines = text.split(/\r?\n/);
  const chunks: TextChunk[] = [];
  let currentSection = '';
  let buffer: string[] = [];
  let lineStart = 1;

  // Regex to detect headings (markdown, screenplay format, etc.)
  const headingRegex = /^(#|\w+\.|[A-Z][A-Z\s]{4,}|INT\.|EXT\.)/;

  function flushBuffer(lineEnd: number) {
    if (buffer.length === 0) return;
    
    const text = buffer.join('\n').trim();
    if (!text) return;

    // Split into sliding windows if text is too long
    const words = text.split(/\s+/);
    let start = 0;

    while (start < words.length) {
      let end = start;
      let tokenCount = 0;

      // Add words until we hit the token limit
      while (end < words.length && tokenCount + roughTokenCount(words[end] + ' ') <= maxTokens) {
        tokenCount += roughTokenCount(words[end] + ' ');
        end++;
      }

      // Ensure we have at least one word per chunk
      if (end === start) {
        end = start + 1;
      }

      const chunkText = words.slice(start, end).join(' ');
      if (chunkText.trim().length > 0) {
        chunks.push({
          text: chunkText,
          section: currentSection,
          lineStart,
          lineEnd,
        });
      }

      if (end >= words.length) break;

      // Move start position with overlap
      const overlapWords = Math.floor(overlap / (roughTokenCount('avgword') || 1));
      start = Math.max(start + 1, end - overlapWords);
    }

    buffer = [];
  }

  lines.forEach((line, index) => {
    if (headingRegex.test(line.trim())) {
      flushBuffer(index);
      currentSection = line.trim();
      lineStart = index + 1;
    }
    buffer.push(line);
  });

  flushBuffer(lines.length);
  return chunks;
}
