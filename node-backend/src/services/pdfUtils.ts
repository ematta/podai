import fs from 'fs/promises';
import pdfParse from 'pdf-parse';

/**
 * Extract text from a PDF file
 */
// Default implementation using real dependencies
export async function extractTextFromPdf(filePath: string): Promise<string> {
  return _extractTextFromPdf(filePath, fs.readFile, pdfParse);
}

// Testable implementation with injectable dependencies
export async function _extractTextFromPdf(
  filePath: string, 
  readFileFn = fs.readFile,
  pdfParseFn = pdfParse
): Promise<string> {
  try {
    const dataBuffer = await readFileFn(filePath);
    const data = await pdfParseFn(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error extracting text from PDF: ${error}`);
    throw new Error('Error extracting text from PDF');
  }
}

/**
 * Generate markdown from a PDF file
 */
// Default implementation using real dependencies
export async function generateMarkdownFromPdf(filePath: string): Promise<string> {
  return _generateMarkdownFromPdf(filePath, fs.readFile, pdfParse);
}

// Testable implementation with injectable dependencies
export async function _generateMarkdownFromPdf(
  filePath: string,
  readFileFn = fs.readFile,
  pdfParseFn = pdfParse
): Promise<string> {
  try {
    const dataBuffer = await readFileFn(filePath);
    const data = await pdfParseFn(dataBuffer);
    
    // Create markdown content
    let markdown = '';
    
    // Add title
    const title = data.info.Title || 'Untitled Document';
    markdown += `# ${title}\n\n`;
    
    // Add metadata if available
    if (data.info.Author) {
      markdown += `Author: ${data.info.Author}\n\n`;
    }
    
    if (data.info.CreationDate) {
      markdown += `Created: ${data.info.CreationDate}\n\n`;
    }
    
    // Add page count
    markdown += `Pages: ${data.numpages}\n\n`;
    
    // Add main content
    markdown += data.text;
    
    return markdown;
  } catch (error) {
    console.error(`Error generating markdown from PDF: ${error}`);
    throw new Error('Error generating markdown from PDF');
  }
}

/**
 * Split text into chunks of approximately the specified size
 * Tries to break at sentence boundaries when possible
 */
export function splitTextIntoChunks(text: string, chunkSize: number = 1000): string[] {
  // Handle empty text case
  if (!text || text.length === 0) {
    return [''];
  }
  
  const chunks: string[] = [];
  let currentPos = 0;
  
  while (currentPos < text.length) {
    // Determine end position (ensure we don't exceed text length)
    let endPos = Math.min(currentPos + chunkSize, text.length);
    
    // If we're not at the end, try to find a sentence boundary
    if (endPos < text.length) {
      // Look for the last sentence boundary within the chunk size limit
      const sentenceEnd = text.lastIndexOf('. ', endPos);
      const exclamationEnd = text.lastIndexOf('! ', endPos);
      const questionEnd = text.lastIndexOf('? ', endPos);
      
      // Find the latest sentence boundary
      const boundaries = [sentenceEnd, exclamationEnd, questionEnd]
        .filter(pos => pos > currentPos && pos < endPos);
      
      const lastBoundary = boundaries.length > 0 
        ? Math.max(...boundaries) + 2  // Include the punctuation and space
        : -1;
      
      if (lastBoundary > 0) {
        endPos = lastBoundary;
      }
    }
    
    // Add the chunk
    chunks.push(text.substring(currentPos, endPos));
    currentPos = endPos;
  }
  
  return chunks;
}
