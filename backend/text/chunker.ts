export const MAX_CHARS_PER_CHUNK = 6000;
export const CHUNK_OVERLAP = 200;

export interface TextChunk {
  text: string;
  index: number;
  section?: string;
  lineStart?: number;
  lineEnd?: number;
}

export function chunkText(input: string): TextChunk[] {
  if (!input || input.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const max = Math.max(1000, MAX_CHARS_PER_CHUNK);
  const step = max - CHUNK_OVERLAP;

  for (let i = 0; i < input.length; i += step) {
    const text = input.slice(i, i + max);
    if (text.trim().length > 0) {
      chunks.push({
        text: text.trim(),
        index: chunks.length,
      });
    }
  }

  return chunks;
}

export function chunkByHeadingsAndWindow(text: string, maxTokens: number = 800, overlap: number = 120): TextChunk[] {
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
          index: chunks.length,
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

function roughTokenCount(text: string): number {
  return Math.ceil(text.length / 4); // Rough heuristic: 4 chars per token
}
