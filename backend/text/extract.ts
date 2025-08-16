import { api } from "encore.dev/api";
import { Bucket } from "encore.dev/storage/objects";

const docsBucket = new Bucket("docs");
const scriptsBucket = new Bucket("scripts");

export interface ExtractTextRequest {
  s3Key: string;
  contentType?: string;
}

export interface ExtractTextResponse {
  text: string;
}

// Extracts text from PDF/DOCX files stored in S3
export const extractText = api<ExtractTextRequest, ExtractTextResponse>(
  { expose: false, method: "POST", path: "/text/extract" },
  async (req) => {
    // Try docs bucket first, then scripts bucket
    let buffer: Buffer;
    try {
      buffer = await docsBucket.download(req.s3Key);
    } catch {
      buffer = await scriptsBucket.download(req.s3Key);
    }
    
    if (isPDF(buffer, req.contentType)) {
      return { text: await extractPDF(buffer) };
    }
    
    if (isDOCX(buffer, req.contentType)) {
      return { text: await extractDOCX(buffer) };
    }
    
    // Fallback to plain text
    return { text: buffer.toString('utf8') };
  }
);

function isPDF(buffer: Buffer, contentType?: string): boolean {
  return (contentType?.includes('pdf')) || buffer.slice(0, 4).toString() === '%PDF';
}

function isDOCX(buffer: Buffer, contentType?: string): boolean {
  return (contentType?.includes('word') || contentType?.includes('officedocument')) || 
         buffer.slice(0, 2).toString('hex') === '504b';
}

async function extractPDF(buffer: Buffer): Promise<string> {
  // Simple PDF text extraction - in production, use pdf-parse or similar
  const text = buffer.toString('utf8');
  // Extract readable text between stream markers
  const matches = text.match(/stream\s*(.*?)\s*endstream/gs);
  if (matches) {
    return matches.map(m => m.replace(/stream|endstream/g, '').trim()).join('\n');
  }
  return text;
}

async function extractDOCX(buffer: Buffer): Promise<string> {
  // Simple DOCX text extraction - in production, use mammoth or similar
  const text = buffer.toString('utf8');
  // Extract text from XML content
  const xmlMatches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/gs);
  if (xmlMatches) {
    return xmlMatches.map(m => m.replace(/<[^>]*>/g, '')).join(' ');
  }
  return text;
}
