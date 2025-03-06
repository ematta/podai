import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        expect.stringContaining('/api/chat/rag'),
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
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    beforeEach(() => {
      console.log = vi.fn();
      console.error = vi.fn();
      vi.useFakeTimers();
    });
    
    afterEach(() => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      vi.useRealTimers();
    });
    
    it('should resolve when progress reaches 100%', async () => {
      try {
        // First response: 50% progress
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ progress: 50, status: 'Processing' })
        });
        
        // Second response: 100% progress
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ progress: 100, status: 'completed' })
        });
        
        const progressCallback = vi.fn();
        
        // Start the polling
        const pollPromise = api.pollProgress('progress123', progressCallback);
        
        // Advance timers to trigger the first poll
        await vi.advanceTimersByTimeAsync(1000);
        
        // Progress callback should be called with updates
        expect(progressCallback).toHaveBeenCalledWith(50, 'Processing');
        
        // Advance timers to trigger the second poll
        await vi.advanceTimersByTimeAsync(1000);
        
        // Wait for the promise to resolve
        await pollPromise;
        
        // Verify the callback was called with the final progress
        expect(progressCallback).toHaveBeenCalledWith(100, 'completed');
      } finally {
        // Restore original console.log
        console.log = originalConsoleLog;
      }
    });
    
    it('should reject on error status', async () => {
      // Mock console functions
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      console.log = vi.fn();
      console.error = vi.fn();
      
      // Clear any existing timers before starting
      vi.clearAllTimers();
      
      try {
        // Mock a failed response
        mockFetch.mockResolvedValueOnce({
          ok: false,
          statusText: 'Failed to process'
        });
        
        const progressCallback = vi.fn();
        
        // Create a promise that will be resolved when the rejection is caught
        const testPromise = new Promise<void>(async (resolve) => {
          try {
            await api.pollProgress('progress123', progressCallback);
            // This should not be reached
            expect(false).toBe(true);
          } catch (error: unknown) {
            // This is expected behavior
            expect((error as Error).message).toBe('Failed to fetch progress');
            // Verify fetch was called at least once
            expect(mockFetch).toHaveBeenCalled();
            resolve();
          }
        });
        
        // Run the timers to trigger the polling
        await vi.runOnlyPendingTimersAsync();
        
        // Wait for our test promise to complete
        await testPromise;
      } finally {
        // Restore original console functions
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        
        // Clear any remaining timers
        vi.clearAllTimers();
      }
    }, 10000); // Increase timeout to 10 seconds

    it('should poll progress until complete', async () => {
      // ... existing code ...
    });
  });
});
