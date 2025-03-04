import { createLogger } from '../config/logger.js';

const logger = createLogger('progress-service');

interface ProgressData {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: any;
}

class ProgressService {
  private progressMap: Map<string, ProgressData>;

  constructor() {
    this.progressMap = new Map();
  }

  /**
   * Initialize progress tracking for a file
   */
  public initProgress(fileId: string): void {
    this.progressMap.set(fileId, {
      status: 'pending',
      progress: 0
    });
    logger.info(`Initialized progress tracking for file ${fileId}`);
  }

  /**
   * Update progress for a file
   */
  public updateProgress(fileId: string, progress: number): void {
    const currentProgress = this.progressMap.get(fileId);
    if (!currentProgress) {
      throw new Error(`No progress tracking found for file ${fileId}`);
    }

    this.progressMap.set(fileId, {
      ...currentProgress,
      progress: Math.min(100, Math.max(0, progress))
    });
    logger.debug(`Updated progress for file ${fileId}: ${progress}%`);
  }

  /**
   * Mark file processing as completed
   */
  public completeProgress(fileId: string, result?: any): void {
    const currentProgress = this.progressMap.get(fileId);
    if (!currentProgress) {
      throw new Error(`No progress tracking found for file ${fileId}`);
    }

    this.progressMap.set(fileId, {
      status: 'completed',
      progress: 100,
      result
    });
    logger.info(`Completed processing for file ${fileId}`);
  }

  /**
   * Mark file processing as failed
   */
  public failProgress(fileId: string, error: string): void {
    const currentProgress = this.progressMap.get(fileId);
    if (!currentProgress) {
      throw new Error(`No progress tracking found for file ${fileId}`);
    }

    this.progressMap.set(fileId, {
      status: 'error',
      progress: currentProgress.progress,
      error
    });
    logger.error(`Failed processing for file ${fileId}: ${error}`);
  }

  /**
   * Get current progress for a file
   */
  public getProgress(fileId: string): ProgressData | null {
    return this.progressMap.get(fileId) || null;
  }

  /**
   * Clean up progress tracking for a file
   */
  public cleanupProgress(fileId: string): void {
    this.progressMap.delete(fileId);
    logger.debug(`Cleaned up progress tracking for file ${fileId}`);
  }
}

export const progressService = new ProgressService();