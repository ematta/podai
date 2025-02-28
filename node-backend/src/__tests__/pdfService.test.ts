import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTextFromPdf, generateMarkdownFromPdf, splitTextIntoChunks } from '../services/pdfService';
import * as fs from 'fs';
import * as path from 'path';

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({
    text: 'This is the extracted PDF text content',
    numpages: 3,
    info: {
      Title: 'Test PDF',
      Author: 'Test Author',
    },
  }),
}));

// Mock fs operations
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn().mockResolvedValue(Buffer.from('fake pdf content')),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('PDF Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe('extractTextFromPdf', () => {
    it('should extract text from a PDF file', async () => {
      const result = await extractTextFromPdf('test.pdf');
      
      expect(result).toBe('This is the extracted PDF text content');
      expect(fs.promises.readFile).toHaveBeenCalledWith('test.pdf');
    });
    
    it('should handle errors during extraction', async () => {
      // Mock a failure
      vi.mocked(fs.promises.readFile).mockRejectedValueOnce(new Error('File not found'));
      
      await expect(extractTextFromPdf('nonexistent.pdf')).rejects.toThrow('Error extracting text from PDF');
    });
  });
  
  describe('generateMarkdownFromPdf', () => {
    it('should generate markdown from PDF text', async () => {
      const result = await generateMarkdownFromPdf('test.pdf');
      
      expect(result).toContain('# Test PDF');
      expect(result).toContain('Author: Test Author');
      expect(result).toContain('This is the extracted PDF text content');
    });
    
    it('should handle PDFs without metadata', async () => {
      // Mock a PDF without metadata
      const pdfParse = await import('pdf-parse');
      vi.mocked(pdfParse.default).mockResolvedValueOnce({
        text: 'Text without metadata',
        numpages: 1,
        info: {},
      });
      
      const result = await generateMarkdownFromPdf('test.pdf');
      
      expect(result).toContain('# Untitled Document');
      expect(result).toContain('Text without metadata');
    });
  });
  
  describe('splitTextIntoChunks', () => {
    it('should split text into chunks of appropriate size', () => {
      const text = 'This is a test. '.repeat(100); // 1500 characters
      const chunks = splitTextIntoChunks(text, 200);
      
      // Each chunk should be approximately 200 chars
      expect(chunks.length).toBeGreaterThan(5);
      expect(chunks[0].length).toBeLessThanOrEqual(220); // Allow some flexibility
      
      // All text should be preserved
      const reassembled = chunks.join('');
      expect(reassembled).toEqual(text);
    });
    
    it('should not split in the middle of sentences', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const chunks = splitTextIntoChunks(text, 20);
      
      // Check that chunks end with sentence terminators
      chunks.forEach((chunk, i) => {
        if (i < chunks.length - 1) {
          expect(chunk.endsWith('. ') || chunk.endsWith('! ') || chunk.endsWith('? ')).toBe(true);
        }
      });
    });
    
    it('should handle empty text', () => {
      const chunks = splitTextIntoChunks('', 100);
      expect(chunks).toEqual(['']);
    });
    
    it('should handle very long sentences', () => {
      // A very long sentence without periods
      const text = 'This is a very long sentence without any periods and it goes on and on and on '.repeat(10);
      const chunks = splitTextIntoChunks(text, 50);
      
      // Should still split even without sentence boundaries
      expect(chunks.length).toBeGreaterThan(1);
      
      // All text should be preserved
      const reassembled = chunks.join('');
      expect(reassembled).toEqual(text);
    });
  });
});
