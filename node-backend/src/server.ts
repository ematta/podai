// Load environment variables before any other imports
import './config/env.js';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { settings } from './config/settings.js';
import { logger } from './config/logger.js';
import { llmService } from './services/llmService.js';
import { pdfService } from './services/pdfService.js';
import { upload, handleUploadError } from './utils/fileMiddleware.js';
import { ChatRequest, ChatResponse, UploadResponse, ErrorResponse } from './types/index.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Global chat history (in memory)
const chatHistory: Record<string, Array<{ question: string; answer: string }>> = {};

// Configure middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../../frontend/dist'))); // For serving frontend files

// Function to check if file exists
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok' });
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' } as ErrorResponse);
    }

    // Save file
    const fileId = await pdfService.saveFile(req.file);
    const filePath = pdfService.getFilePath(fileId);

    // Convert PDF to markdown
    const markdown = await pdfService.pdfToMarkdown(filePath);

    // Generate script
    const script = await llmService.generateScript(markdown);

    // Initialize chat history for this file
    chatHistory[fileId] = [];

    const response: UploadResponse = {
      fileId,
      markdown,
      script
    };

    logger.info(`Successfully processed file with ID: ${fileId}`);
    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Error processing upload: ${error}`);
    return res.status(500).json({ 
      error: 'An error occurred while processing your file' 
    } as ErrorResponse);
  }
}, handleUploadError);

// Chat endpoint
app.post('/chat/:fileId', async (req: express.Request, res: express.Response) => {
  try {
    const { fileId } = req.params;
    const { question } = req.body as ChatRequest;

    if (!question) {
      return res.status(400).json({ 
        error: 'No question provided' 
      } as ErrorResponse);
    }

    // Get file path
    let filePath: string;
    try {
      filePath = pdfService.getFilePath(fileId);
    } catch (error) {
      return res.status(404).json({ 
        error: 'File not found' 
      } as ErrorResponse);
    }

    // Extract text from PDF
    const pdfText = await pdfService.extractTextFromPdf(filePath);

    // Generate answer
    const answer = await llmService.chatWithPdf(question, pdfText);

    // Save to chat history
    if (!chatHistory[fileId]) {
      chatHistory[fileId] = [];
    }
    chatHistory[fileId].push({ question, answer });

    const response: ChatResponse = { answer };
    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Error in chat: ${error}`);
    return res.status(500).json({ 
      error: 'An error occurred while processing your question' 
    } as ErrorResponse);
  }
});

// Get chat history
app.get('/chat/:fileId/history', (req: express.Request, res: express.Response) => {
  const { fileId } = req.params;
  
  if (!chatHistory[fileId]) {
    return res.status(404).json({ 
      error: 'No chat history found for this file' 
    } as ErrorResponse);
  }
  
  return res.status(200).json(chatHistory[fileId]);
});

// Serve the frontend if no API routes match
app.get('*', (req: express.Request, res: express.Response) => {
  const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
  
  if (fileExists(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.stack}`);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server if not being imported
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = settings.PORT;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${settings.NODE_ENV}`);
    logger.info(`Log level: ${settings.LOG_LEVEL}`);
    logger.info(`Max upload size: ${settings.MAX_UPLOAD_SIZE / (1024 * 1024)}MB`);
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
export default app;
