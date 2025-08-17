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
    // Validate input - ensure we only accept S3 keys, not file content
    if (!req.s3Key || typeof req.s3Key !== 'string') {
      throw new Error("Invalid S3 key");
    }

    // Try docs bucket first, then scripts bucket
    let buffer: Buffer;
    try {
      buffer = await docsBucket.download(req.s3Key);
    } catch {
      try {
        buffer = await scriptsBucket.download(req.s3Key);
      } catch (error) {
        throw new Error(`Failed to download file from S3: ${error}`);
      }
    }
    
    // Limit file size to prevent memory issues (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (buffer.length > maxSize) {
      throw new Error(`File too large: ${buffer.length} bytes (max ${maxSize})`);
    }
    
    if (isPDF(buffer, req.contentType)) {
      return { text: await extractPDF(buffer) };
    }
    
    if (isDOCX(buffer, req.contentType)) {
      return { text: await extractDOCX(buffer) };
    }
    
    if (isFDX(buffer, req.contentType)) {
      return { text: await extractFDX(buffer) };
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

function isFDX(buffer: Buffer, contentType?: string): boolean {
  return (contentType?.includes('fdx')) || 
         buffer.toString('utf8', 0, 100).includes('<?xml') && 
         buffer.toString('utf8', 0, 500).includes('FinalDraft');
}

async function extractPDF(buffer: Buffer): Promise<string> {
  // Enhanced PDF text extraction
  const text = buffer.toString('latin1');
  
  // Look for text objects in PDF
  const textMatches = text.match(/\(([^)]+)\)\s*Tj/g);
  if (textMatches) {
    return textMatches
      .map(match => match.replace(/^\(|\)\s*Tj$/g, ''))
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
  }
  
  // Fallback: extract readable text between stream markers
  const streamMatches = text.match(/stream\s*(.*?)\s*endstream/gs);
  if (streamMatches) {
    return streamMatches
      .map(m => m.replace(/stream|endstream/g, '').trim())
      .filter(t => t.length > 0)
      .join('\n');
  }
  
  // Last resort: try to find any readable text
  const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  return readableText.length > 100 ? readableText : 'Unable to extract text from PDF';
}

async function extractDOCX(buffer: Buffer): Promise<string> {
  // Enhanced DOCX text extraction
  const text = buffer.toString('utf8');
  
  // Extract text from XML content
  const xmlMatches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/gs);
  if (xmlMatches) {
    return xmlMatches
      .map(m => m.replace(/<[^>]*>/g, ''))
      .filter(t => t.trim().length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Fallback: look for paragraph content
  const paraMatches = text.match(/<w:p[^>]*>(.*?)<\/w:p>/gs);
  if (paraMatches) {
    return paraMatches
      .map(m => m.replace(/<[^>]*>/g, ''))
      .filter(t => t.trim().length > 0)
      .join('\n')
      .trim();
  }
  
  return 'Unable to extract text from DOCX';
}

async function extractFDX(buffer: Buffer): Promise<string> {
  // Extract text from Final Draft XML format
  const text = buffer.toString('utf8');
  
  // Extract dialogue and action from FDX
  const contentMatches = text.match(/<Text[^>]*>(.*?)<\/Text>/gs);
  if (contentMatches) {
    return contentMatches
      .map(m => m.replace(/<[^>]*>/g, ''))
      .filter(t => t.trim().length > 0)
      .join('\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
  
  // Fallback: extract any text content
  const allText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return allText.length > 100 ? allText : 'Unable to extract text from FDX';
}
