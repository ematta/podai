import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateChatResponse } from '../services/chatService';
import { llmService } from '../services/llmService';

// Mock dependencies
vi.mock('../services/llmService', () => ({
  llmService: {
    chatWithPdf: vi.fn()
  }
}));

describe('Chat Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  describe('generateChatResponse', () => {
    it('should generate a chat response with context from similar chunks', async () => {
      // Mock LLM service response
      vi.mocked(llmService.chatWithPdf).mockResolvedValue('Generated response with context');
      
      const result = await generateChatResponse('What is the main topic?', 'test-file-id');
      
      // Check that LLM service was called with the question and file ID
      expect(llmService.chatWithPdf).toHaveBeenCalledWith(
        'What is the main topic?',
        'test-file-id'
      );
      
      // Check the result is the LLM's response
      expect(result).toBe('Generated response with context');
    });
    
    it('should handle errors in the LLM service', async () => {
      // Mock an error from the LLM service
      vi.mocked(llmService.chatWithPdf).mockRejectedValue(new Error('LLM service error'));
      
      // Assert that calling the function throws an error with the expected message
      await expect(async () => {
        await generateChatResponse('What is the main topic?', 'test-file-id');
      }).rejects.toThrow('Failed to generate chat response');
    });
  });
});
