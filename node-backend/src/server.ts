/**
 * Main server application file for the PDF AI Assistant backend.
 * This file sets up the Express server, configures middleware, and defines API endpoints
 * for PDF processing, chat functionality, and file management.
 *
 * @module server
 */

// Load environment variables before any other imports
import './config/env.js';

// Import app from app.js
import appInstance from './app.js';  // Renamed to avoid conflict

import express, { NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createLogger } from './config/logger.js';
import { settings } from './config/settings.js';
import { llmService } from './services/llmService.js';
import { pdfService } from './services/pdfService.js';
import * as chatService from './services/chatService.js';
import { openRouterService } from './services/openRouterService.js';
import { upload, handleUploadError } from './utils/fileMiddleware.js';
import { ProgressTracker } from './utils/progressTracker.js';
import { getMemoryUsage } from './utils/profiler.js'; 
import fileUploadRoutes from './routes/fileUploadRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import testRoutes from './routes/testRoutes.js';
import testApiRoutes from './routes/testApiRoutes.js';

// Create logger
const logger = createLogger('server');

// Test file system access at startup
const uploadFolder = process.env.UPLOAD_FOLDER || 'uploads';
const uploadDir = path.resolve(process.cwd(), uploadFolder);

// File system and directory tests
logger.info(`Checking upload directory: ${uploadDir}`);
if (!fs.existsSync(uploadDir)) {
  logger.info(`Creating upload directory: ${uploadDir}`);
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Created upload directory: ${uploadDir}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to create upload directory: ${uploadDir} - ${errorMessage}`);
  }
}

// Test directory permissions
try {
  fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
  logger.info(`Upload directory is readable and writable: ${uploadDir}`);
  
  // Test file creation
  const testFile = path.join(uploadDir, '.test-file');
  fs.writeFileSync(testFile, 'test');
  logger.info(`Successfully created test file: ${testFile}`);
  
  // Clean up
  fs.unlinkSync(testFile);
  logger.info(`Successfully deleted test file: ${testFile}`);
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error(`File system permission error: ${errorMessage}`);
}

// Start the server if not being imported
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 8081;
  appInstance.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    
    // Log initial memory usage
    if (process.env.ENABLE_PROFILING === 'true') {
      const memoryUsage = getMemoryUsage();
      logger.info('Initial memory usage:', memoryUsage);
      
      // Set up periodic memory usage logging (every 5 minutes)
      setInterval(() => {
        const currentMemory = getMemoryUsage();
        logger.info('Current memory usage:', currentMemory);
      }, 5 * 60 * 1000);
    }
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully.');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Shutting down gracefully.');
  process.exit(0);
});

// Export for testing
export { appInstance as app };
export default appInstance;