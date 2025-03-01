import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Define the progress entry type
interface ProgressEntry {
  progress: number;
  status: 'pending' | 'completed' | 'error';
  message: string;
}

// Augment the global namespace to include our progressMap
declare global {
  var progressMap: Map<string, ProgressEntry>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(path.resolve(__dirname, '../../..'), 'test-uploads');

/**
 * Create a test PDF file for testing
 * @param filename Name to give the test file
 * @returns Path to the created test file
 */
export const createTestPdfFile = (filename: string = 'test.pdf'): string => {
  const filePath = path.join(uploadDir, filename);
  
  // Create a simple PDF-like file (not actually valid PDF, just for testing)
  const content = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF';
  fs.writeFileSync(filePath, content);
  
  return filePath;
};

/**
 * Clean up test files
 * @param filePath Path to file to clean up
 */
export const cleanupTestFile = (filePath: string): void => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

/**
 * Setup a global progress map entry for testing
 * @param progressId ID to use for progress
 * @param progress Progress value (0-100)
 * @param status Status string
 * @param message Optional message
 * @returns The progress ID
 */
export const setupTestProgress = (
  progressId: string = 'test-progress-id',
  progress: number = 50,
  status: 'pending' | 'completed' | 'error' = 'pending',
  message: string = 'Processing test file'
): string => {
  // Ensure global progressMap exists
  if (!global.progressMap) {
    global.progressMap = new Map<string, ProgressEntry>();
  }
  
  // Add test progress entry
  global.progressMap.set(progressId, {
    progress,
    status,
    message
  });
  
  return progressId;
};

/**
 * Get progress entry for testing
 * @param progressId ID to get progress for
 * @returns The progress entry or undefined if not found
 */
export const getTestProgress = (progressId: string): ProgressEntry | undefined => {
  return global.progressMap?.get(progressId);
};

/**
 * Clean up a test progress entry
 * @param progressId ID to clean up
 */
export const cleanupTestProgress = (progressId: string): void => {
  if (global.progressMap) {
    global.progressMap.delete(progressId);
  }
};

/**
 * Clean up all test progress entries
 */
export const cleanupAllTestProgress = (): void => {
  if (global.progressMap) {
    global.progressMap.clear();
  }
};
