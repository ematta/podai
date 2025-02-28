import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateChatResponse } from '../services/chatService';
import * as vectorStoreService from '../services/vectorStoreService';
import * as llmService from '../services/llmService';

// Mock dependencies
vi.mock('../services/vectorStoreService', () => ({
  searchSimilarChunks: vi.fn(),
}));

vi.mock('../services/llmService', () => ({
  generateResponse: vi.fn(),
}));

describe('Chat Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe('generateChatResponse', () => {
    it('should generate a chat response with context from similar chunks', async () => {
      // Mock similar chunks returned from the vector store
      vi.mocked(vectorStoreService.searchSimilarChunks).mockResolvedValue([
        { text: 'Similar chunk 1', score: 0.95 },
        { text: 'Similar chunk 2', score: 0.85 },
      ]);
      
      // Mock LLM response
      vi.mocked(llmService.generateResponse).mockResolvedValue('Generated response with context');
      
      const result = await generateChatResponse('What is the main topic?', 'test-file-id');
      
      // Check the vector store was queried
      expect(vectorStoreService.searchSimilarChunks).toHaveBeenCalledWith(
        'What is the main topic?',
        'test-file-id'
      );
      
      // Check that LLM was called with the context and question
      expect(llmService.generateResponse).toHaveBeenCalledWith(
        'What is the main topic?',
        expect.stringContaining('Similar chunk 1')
      );
      
      // Check the result is the LLM's response
      expect(result).toBe('Generated response with context');
    });
    
    it('should handle the case when no similar chunks are found', async () => {
      // Mock empty results from vector store
      vi.mocked(vectorStoreService.searchSimilarChunks).mockResolvedValue([]);
      
      const result = await generateChatResponse('What is the main topic?', 'test-file-id');
      
      // Should return a default message
      expect(result).toBe("I couldn't find any relevant information to answer your question.");
      
      // LLM service should not be called since there were no chunks
      expect(llmService.generateResponse).not.toHaveBeenCalled();
    });
    
    it('should handle errors in the vector store search', async () => {
      // Mock error in vector store
      vi.mocked(vectorStoreService.searchSimilarChunks).mockRejectedValue(
        new Error('Vector store error')
      );
      
      await expect(
        generateChatResponse('What is the main topic?', 'test-file-id')
      ).rejects.toThrow('Failed to generate chat response: Error: Vector store error');
    });
    
    it('should handle errors in the LLM service', async () => {
      // Mock successful vector store search
      vi.mocked(vectorStoreService.searchSimilarChunks).mockResolvedValue([
        { text: 'Similar chunk 1', score: 0.95 },
      ]);
      
      // Mock error in LLM service
      vi.mocked(llmService.generateResponse).mockRejectedValue(
        new Error('LLM service error')
      );
      
      await expect(
        generateChatResponse('What is the main topic?', 'test-file-id')
      ).rejects.toThrow('Failed to generate chat response: Error: LLM service error');
    });
  });
});
