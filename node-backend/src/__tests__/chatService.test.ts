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
        'test-file-id',
        'What is the main topic?'
      );
      
      // Check that LLM was called with the context
      expect(llmService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Similar chunk 1'),
        expect.stringContaining('What is the main topic?')
      );
      
      // Check the result is the LLM's response
      expect(result).toBe('Generated response with context');
    });
    
    it('should handle the case when no similar chunks are found', async () => {
      // Mock empty results from vector store
      vi.mocked(vectorStoreService.searchSimilarChunks).mockResolvedValue([]);
      
      // Mock LLM response without context
      vi.mocked(llmService.generateResponse).mockResolvedValue('I cannot find relevant information');
      
      const result = await generateChatResponse('What is the main topic?', 'test-file-id');
      
      // Check that LLM was called with instructions for no context
      expect(llmService.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('no relevant information'),
        expect.stringContaining('What is the main topic?')
      );
      
      // Check the result is the LLM's response
      expect(result).toBe('I cannot find relevant information');
    });
    
    it('should handle errors in the vector store search', async () => {
      // Mock error in vector store
      vi.mocked(vectorStoreService.searchSimilarChunks).mockRejectedValue(
        new Error('Vector store error')
      );
      
      // Mock LLM response for error case
      vi.mocked(llmService.generateResponse).mockResolvedValue('Sorry, an error occurred');
      
      await expect(
        generateChatResponse('What is the main topic?', 'test-file-id')
      ).rejects.toThrow('Error generating chat response');
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
      ).rejects.toThrow('Error generating chat response');
    });
  });
});
