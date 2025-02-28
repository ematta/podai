import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getRagChatResponse', () => {
    it('should fetch chat response successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ answer: 'This is a test response' }),
      });

      const result = await api.getRagChatResponse('What is the main topic?', 'file123');
      
      // Check fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat-rag'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            question: 'What is the main topic?',
            fileId: 'file123',
          }),
        })
      );
      
      // Check result is correct
      expect(result).toBe('This is a test response');
    });

    it('should handle errors properly', async () => {
      // Silence console.error during this test
      const originalConsoleError = console.error;
      console.error = vi.fn();
      
      try {
        // Mock error response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          statusText: 'Not Found',
        });

        // Verify that the error is thrown
        await expect(api.getRagChatResponse('What is the main topic?', 'file123'))
          .rejects.toThrow('Failed to get chat response: Not Found');
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
    });
  });
  
  describe('pollProgress', () => {
    it('should resolve when progress reaches 100%', async () => {
      // Mock the console.log to avoid cluttering test output
      const originalConsoleLog = console.log;
      console.log = vi.fn();
      
      try {
        // First call returns in progress
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ progress: 50, message: 'Processing', status: 'pending' }),
        });

        // Second call returns completed
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            progress: 100,
            status: 'completed',
            message: 'Processing complete',
            result: { answer: 'This is the answer' }
          })
        });

        const progressCallback = vi.fn();
        const result = await api.pollProgress('progress123', progressCallback);

        // Progress callback should be called with updates
        expect(progressCallback).toHaveBeenCalledWith(50, 'Processing');
        
        // Should resolve with true when completed
        expect(result).toBe(true);
      } finally {
        // Restore original console.log
        console.log = originalConsoleLog;
      }
    });

    it('should reject on error status', async () => {
      // Mock the console.log and console.error to avoid cluttering test output
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      console.log = vi.fn();
      console.error = vi.fn();
      
      try {
        // Return error status
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            progress: 25, 
            message: 'Failed to process', 
            status: 'error' 
          }),
        });

        const progressCallback = vi.fn();
        
        // Verify that the promise rejects
        await expect(
          api.pollProgress('progress123', progressCallback)
        ).rejects.toThrow('Failed to process');
      } finally {
        // Restore original console functions
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      }
    });
  });
});
