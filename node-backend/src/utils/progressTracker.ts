import { createLogger } from '../config/logger.js';

// In-memory progress tracking for long-running operations
interface ProgressInfo {
  id: string;
  progress: number;
  message: string;
  status: 'processing' | 'completed' | 'error';
  startTime: number;
  lastUpdateTime: number;
  endTime?: number;
  error?: string;
}

const logger = createLogger('progress-tracker');

/**
 * Class for tracking progress of long-running operations
 */
export class ProgressTracker {
  private static progressMap = new Map<string, ProgressInfo>();

  /**
   * Create a new progress tracker
   */
  static createProgress(id: string, initialMessage = 'Starting...') {
    this.progressMap.set(id, {
      id,
      progress: 0,
      message: initialMessage,
      status: 'processing',
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    });
    
    logger.info(`[Progress ${id}] Started: ${initialMessage}`);
  }

  /**
   * Update the progress of a job
   */
  static updateProgress(id: string, progress: number, message?: string) {
    const progressInfo = this.progressMap.get(id);
    
    if (!progressInfo) {
      logger.warn(`Attempted to update non-existent progress tracker: ${id}`);
      return;
    }
    
    // Clamp progress between 0 and 100
    progress = Math.max(0, Math.min(100, progress));
    
    // Only update if there's actual progress or a new message
    if (progress > progressInfo.progress || message !== progressInfo.message) {
      progressInfo.progress = progress;
      
      if (message) {
        progressInfo.message = message;
      }
      
      progressInfo.lastUpdateTime = Date.now();
      
      // Detailed log only when there's a significant progress change or new message
      if (message || Math.floor(progress / 10) > Math.floor(progressInfo.progress / 10)) {
        logger.info(`[Progress ${id}] ${progress.toFixed(0)}%: ${progressInfo.message}`);
      }
    }
  }

  /**
   * Mark a progress as completed
   */
  static completeProgress(id: string, finalMessage?: string) {
    const progressInfo = this.progressMap.get(id);
    
    if (!progressInfo) {
      logger.warn(`Attempted to complete non-existent progress tracker: ${id}`);
      return;
    }
    
    progressInfo.progress = 100;
    progressInfo.status = 'completed';
    
    if (finalMessage) {
      progressInfo.message = finalMessage;
    }
    
    progressInfo.lastUpdateTime = Date.now();
    progressInfo.endTime = Date.now();
    
    const duration = (progressInfo.endTime - progressInfo.startTime) / 1000; // in seconds
    
    logger.info(`[Progress ${id}] Completed in ${duration.toFixed(2)}s: ${progressInfo.message}`);
    
    // Keep completed progress info for a while before cleanup
    setTimeout(() => {
      this.deleteProgress(id);
    }, 3600000); // Clean up after 1 hour
  }

  /**
   * Mark a progress as failed
   */
  static failProgress(id: string, errorMessage: string) {
    const progressInfo = this.progressMap.get(id);
    
    if (!progressInfo) {
      logger.warn(`Attempted to fail non-existent progress tracker: ${id}`);
      return;
    }
    
    progressInfo.status = 'error';
    progressInfo.message = errorMessage;
    progressInfo.error = errorMessage;
    progressInfo.lastUpdateTime = Date.now();
    progressInfo.endTime = Date.now();
    
    logger.error(`[Progress ${id}] Failed: ${errorMessage}`);
  }

  /**
   * Delete a progress tracker
   */
  static deleteProgress(id: string) {
    this.progressMap.delete(id);
  }

  /**
   * Get the current progress info
   */
  static getProgress(id: string): ProgressInfo | null {
    return this.progressMap.get(id) || null;
  }

  /**
   * Get all progress trackers
   */
  static getAllProgress(): ProgressInfo[] {
    return Array.from(this.progressMap.values());
  }
}
