import { api, APIError } from "encore.dev/api";
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

// Maximum text length for processing (approximately 1 million characters)
const MAX_TEXT_LENGTH = 1_000_000; // 1MB of text as hard cap
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Extracts text from PDF/DOCX files stored in S3
export const extractText = api<ExtractTextRequest, ExtractTextResponse>(
  { expose: false, method: "POST", path: "/text/extract" },
  async (req) => {
    // Validate input - ensure we only accept S3 keys, not file content
    if (!req.s3Key || typeof req.s3Key !== 'string') {
      throw APIError.invalidArgument("Invalid S3 key");
    }

    // Try docs bucket first, then scripts bucket
    let buffer: Buffer;
    try {
      buffer = await docsBucket.download(req.s3Key);
    } catch {
      try {
        buffer = await scriptsBucket.download(req.s3Key);
      } catch (error) {
        throw APIError.notFound(`Failed to download file from S3: ${error}`);
      }
    }
    
    // Limit file size to prevent memory issues
    if (buffer.length > MAX_FILE_SIZE) {
      const fileSizeMB = Math.round(buffer.length / 1024 / 1024);
      const maxSizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024);
      throw APIError.invalidArgument(`File too large: ${fileSizeMB}MB (maximum ${maxSizeMB}MB)`);
    }
    
    let extractedText: string;
    
    try {
      if (isPDF(buffer, req.contentType)) {
        extractedText = await extractPDF(buffer);
      } else if (isDOCX(buffer, req.contentType)) {
        extractedText = await extractDOCX(buffer);
      } else if (isFDX(buffer, req.contentType)) {
        extractedText = await extractFDX(buffer);
      } else {
        // Fallback to plain text
        extractedText = buffer.toString('utf8');
      }
    } catch (error) {
      console.error("Text extraction failed:", error);
      throw APIError.internal("Failed to extract text from file. Please ensure the file is not corrupted.");
    }
    
    // Validate extracted text length - fail fast with clear error
    if (extractedText.length > MAX_TEXT_LENGTH) {
      const textSizeMB = Math.round(extractedText.length / 1024 / 1024 * 10) / 10;
      const maxSizeMB = Math.round(MAX_TEXT_LENGTH / 1024 / 1024 * 10) / 10;
      
      const error = new Error(`Script too large (${textSizeMB}MB text). Please upload a smaller file or split into parts. Maximum allowed: ${maxSizeMB}MB.`);
      (error as any).code = 'payload_too_large';
      (error as any).httpStatus = 413;
      throw error;
    }
    
    if (extractedText.trim().length === 0) {
      throw APIError.invalidArgument("No readable text could be extracted from the file. Please ensure the file contains text content.");
    }
    
    return { text: extractedText };
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
    const extracted = textMatches
      .map(match => match.replace(/^\(|\)\s*Tj$/g, ''))
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
    
    if (extracted.trim().length > 100) {
      return extracted;
    }
  }
  
  // Fallback: extract readable text between stream markers
  const streamMatches = text.match(/stream\s*(.*?)\s*endstream/gs);
  if (streamMatches) {
    const extracted = streamMatches
      .map(m => m.replace(/stream|endstream/g, '').trim())
      .filter(t => t.length > 0)
      .join('\n');
    
    if (extracted.trim().length > 100) {
      return extracted;
    }
  }
  
  // Last resort: try to find any readable text
  const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  if (readableText.length > 100) {
    return readableText;
  }
  
  throw new Error('Unable to extract readable text from PDF');
}

async function extractDOCX(buffer: Buffer): Promise<string> {
  // Enhanced DOCX text extraction
  const text = buffer.toString('utf8');
  
  // Extract text from XML content
  const xmlMatches = text.match(/<w:t[^>]*>(.*?)<\/w:t>/gs);
  if (xmlMatches) {
    const extracted = xmlMatches
      .map(m => m.replace(/<[^>]*>/g, ''))
      .filter(t => t.trim().length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (extracted.length > 100) {
      return extracted;
    }
  }
  
  // Fallback: look for paragraph content
  const paraMatches = text.match(/<w:p[^>]*>(.*?)<\/w:p>/gs);
  if (paraMatches) {
    const extracted = paraMatches
      .map(m => m.replace(/<[^>]*>/g, ''))
      .filter(t => t.trim().length > 0)
      .join('\n')
      .trim();
    
    if (extracted.length > 100) {
      return extracted;
    }
  }
  
  throw new Error('Unable to extract readable text from DOCX');
}

async function extractFDX(buffer: Buffer): Promise<string> {
  // Extract text from Final Draft XML format
  const text = buffer.toString('utf8');
  
  // Extract dialogue and action from FDX
  const contentMatches = text.match(/<Text[^>]*>(.*?)<\/Text>/gs);
  if (contentMatches) {
    const extracted = contentMatches
      .map(m => m.replace(/<[^>]*>/g, ''))
      .filter(t => t.trim().length > 0)
      .join('\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    if (extracted.length > 100) {
      return extracted;
    }
  }
  
  // Fallback: extract any text content
  const allText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (allText.length > 100) {
    return allText;
  }
  
  throw new Error('Unable to extract readable text from FDX');
}
