import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _extractTextFromPdf, _generateMarkdownFromPdf, splitTextIntoChunks } from '../services/pdfUtils';
import * as path from 'path';

// Create mock functions
const mockReadFile = vi.fn().mockResolvedValue(Buffer.from('fake pdf content'));
const mockPdfParse = vi.fn().mockResolvedValue({
  text: 'This is the extracted PDF text content',
  numpages: 3,
  info: {
    Title: 'Test PDF',
    Author: 'Test Author',
  },
});

describe('PDF Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset mock implementations for each test
    mockReadFile.mockResolvedValue(Buffer.from('fake pdf content'));
    mockPdfParse.mockResolvedValue({
      text: 'This is the extracted PDF text content',
      numpages: 3,
      info: {
        Title: 'Test PDF',
        Author: 'Test Author',
      },
    });
  });
  
  describe('extractTextFromPdf', () => {
    it('should extract text from a PDF file', async () => {
      const result = await _extractTextFromPdf('test.pdf', mockReadFile, mockPdfParse);
      
      expect(result).toBe('This is the extracted PDF text content');
      expect(mockReadFile).toHaveBeenCalledWith('test.pdf');
      expect(mockPdfParse).toHaveBeenCalled();
    });
    
    it('should handle errors during extraction', async () => {
      // Mock a failure
      mockReadFile.mockRejectedValueOnce(new Error('File not found'));
      
      await expect(_extractTextFromPdf('nonexistent.pdf', mockReadFile, mockPdfParse))
        .rejects.toThrow('Error extracting text from PDF');
    });
  });
  
  describe('generateMarkdownFromPdf', () => {
    it('should generate markdown from PDF text', async () => {
      const result = await _generateMarkdownFromPdf('test.pdf', mockReadFile, mockPdfParse);
      
      expect(result).toContain('# Test PDF');
      expect(result).toContain('Author: Test Author');
      expect(result).toContain('This is the extracted PDF text content');
    });
    
    it('should handle PDFs without metadata', async () => {
      // Mock a PDF without metadata
      mockPdfParse.mockResolvedValueOnce({
        text: 'Text without metadata',
        numpages: 1,
        info: {},
      });
      
      const result = await _generateMarkdownFromPdf('test.pdf', mockReadFile, mockPdfParse);
      
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
      const longSentence = 'This is a very long sentence without any punctuation ' + 'word '.repeat(100);
      const chunks = splitTextIntoChunks(longSentence, 50);
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // First chunk should be approximately 50 chars
      expect(chunks[0].length).toBeGreaterThanOrEqual(50);
    });
  });
});
