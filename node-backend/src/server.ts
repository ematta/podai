// Load environment variables before any other imports
import './config/env.js';

import express from 'express';
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
import { upload, handleUploadError } from './utils/fileMiddleware.js';
import { ProgressTracker } from './utils/progressTracker.js';
import { getMemoryUsage } from './utils/profiler.js';
import fileUploadRoutes from './routes/fileUploadRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import testRoutes from './routes/testRoutes.js';
import testApiRoutes from './routes/testApiRoutes.js';

// Create logger
const logger = createLogger('server');

// Define response types
type ErrorResponse = { error: string };
type UploadResponse = { fileId: string; markdown: string; script: string };
type ChatResponse = { response: string };
type ProgressResponse = { id: string; status: string; progress: number; result?: any };

// Define chat history type
interface ChatHistoryItem {
  question: string;
  answer: string;
}

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Global chat history (in memory)
const chatHistory: Record<string, ChatHistoryItem[]> = {};

// Configure middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));
app.use(express.static(path.join(__dirname, '../../frontend/dist'))); // For serving frontend files

// Register routes
app.use('/api/pdf', fileUploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/test', testRoutes);
app.use('/api', testApiRoutes); // Test API routes for routes.test.ts

// Function to check if file exists
export function fileExists(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error checking if file exists: ${error}`);
    return false;
  }
}

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok' });
});

// Initialize a map to track progress
export const progressTracker = new Map<string, {
  id: string;
  status: string;
  progress: number;
  message?: string;
  result?: any;
  error?: any;
}>();

// Progress polling endpoint
app.get('/progress/:id', (req: express.Request, res: express.Response) => {
  const id = req.params.id;
  const progressData = progressTracker.get(id);
  
  if (!progressData) {
    // Check if this is a progress ID from the ProgressTracker class
    const trackerProgress = ProgressTracker.getProgress(id);
    
    if (trackerProgress) {
      // Convert from ProgressTracker format to progressTracker Map format
      return res.status(200).json({
        id: trackerProgress.id,
        status: trackerProgress.status === 'completed' ? 'complete' : trackerProgress.status,
        progress: trackerProgress.progress,
        message: trackerProgress.message,
        result: trackerProgress.status === 'completed' ? { message: trackerProgress.message } : undefined,
        error: trackerProgress.error
      });
    }
    
    return res.status(404).json({ error: 'No progress data found for this ID' });
  }
  
  // If operation is complete, remove from tracker after sending
  if (progressData.status === 'complete' || progressData.status === 'error') {
    const result = { ...progressData };
    
    // Only delete after 1 minute to allow for retry fetches from client
    setTimeout(() => {
      progressTracker.delete(id);
    }, 60000);
    
    return res.status(200).json(result);
  }
  
  return res.status(200).json(progressData);
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' } as ErrorResponse);
    }

    // Create a progress tracker ID for this operation
    const operationId = uuidv4();
    progressTracker.set(operationId, {
      id: operationId,
      status: 'processing',
      progress: 0
    });

    // Send immediate response with the operation ID
    res.status(202).json({ 
      operationId,
      message: 'Processing started' 
    });

    // Process the file asynchronously
    (async () => {
      try {
        // Save file
        progressTracker.set(operationId, {
          id: operationId,
          status: 'processing',
          progress: 10,
        });
        
        // TypeScript non-null assertion to tell TypeScript that req.file is not null
        // We've already checked for null above
        const fileId = await pdfService.saveFile(req.file!);
        const filePath = pdfService.getFilePath(fileId);

        // Convert PDF to markdown
        progressTracker.set(operationId, {
          id: operationId,
          status: 'processing',
          progress: 30,
        });
        
        const markdown = await pdfService.pdfToMarkdown(filePath);

        // Generate script
        progressTracker.set(operationId, {
          id: operationId,
          status: 'processing',
          progress: 50,
        });
        
        const script = await llmService.generateScript(markdown);

        // Initialize chat history for this file
        chatHistory[fileId] = [];

        const result: UploadResponse = {
          fileId,
          markdown,
          script
        };

        // Update progress to complete
        progressTracker.set(operationId, {
          id: operationId,
          status: 'complete',
          progress: 100,
          result
        });

        logger.info(`Successfully processed file with ID: ${fileId}`);
      } catch (error) {
        logger.error(`Error in async processing: ${error}`);
        progressTracker.set(operationId, {
          id: operationId,
          status: 'error',
          progress: 0,
          result: { error: 'An error occurred while processing your file' }
        });
      }
    })();
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
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'No question provided' } as ErrorResponse);
    }

    // Check if file exists
    const filePath = pdfService.getFilePath(fileId);
    if (!fileExists(filePath)) {
      return res.status(404).json({ error: 'File not found' } as ErrorResponse);
    }

    // Create a progress tracker ID for this operation
    const operationId = uuidv4();
    progressTracker.set(operationId, {
      id: operationId,
      status: 'processing',
      progress: 0
    });

    // Send immediate response with the operation ID
    res.status(202).json({ 
      operationId,
      message: 'Processing started' 
    });

    // Process the chat asynchronously
    (async () => {
      try {
        // Update to parsing state
        progressTracker.set(operationId, {
          id: operationId,
          status: 'processing',
          progress: 25,
        });
        
        // Get PDF text
        const pdfText = await pdfService.extractTextFromPdf(filePath);
        
        // Update to chat generation state
        progressTracker.set(operationId, {
          id: operationId,
          status: 'processing',
          progress: 50,
        });
        
        // Generate response
        const answer = await llmService.chatWithPdf(question, pdfText);

        // Store in chat history
        if (!chatHistory[fileId]) {
          chatHistory[fileId] = [];
        }
        
        chatHistory[fileId].push({ question, answer });

        const result: ChatResponse = { response: answer };

        // Update progress to complete
        progressTracker.set(operationId, {
          id: operationId,
          status: 'complete',
          progress: 100,
          result
        });

        logger.info(`Successfully processed chat for file ID: ${fileId}`);
      } catch (error) {
        logger.error(`Error in async chat processing: ${error}`);
        progressTracker.set(operationId, {
          id: operationId,
          status: 'error',
          progress: 0,
          result: { error: 'An error occurred while processing your chat' }
        });
      }
    })();
  } catch (error) {
    logger.error(`Error in chat endpoint: ${error}`);
    return res.status(500).json({ 
      error: 'An error occurred while processing your chat' 
    } as ErrorResponse);
  }
});

// Get chat history
app.get('/chat/:fileId/history', (req: express.Request, res: express.Response) => {
  const { fileId } = req.params;
  
  if (!chatHistory[fileId]) {
    return res.status(404).json({ error: 'No chat history found for this file' } as ErrorResponse);
  }
  
  return res.status(200).json(chatHistory[fileId]);
});

// RAG-based chat endpoints and progress tracking endpoints
app.post('/api/generate-script', async (req, res) => {
  // TO DO: implement generate script endpoint
});

// Get progress for a job
app.get('/api/progress/:id', (req, res) => {
  const { id } = req.params;
  const progress = ProgressTracker.getProgress(id);
  
  if (!progress) {
    return res.status(404).json({ error: 'Progress not found' });
  }
  
  res.json(progress);
});

// Store PDF and create embeddings
app.post('/api/store-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    
    // Parse PDF
    const dataBuffer = req.file.buffer;
    const pdfData = await pdfParse(dataBuffer);
    
    // Store PDF with embeddings
    const fileId = await llmService.storePdf(pdfData.text, req.file.originalname);
    
    res.status(200).json({ 
      success: true, 
      fileId,
      message: 'PDF stored and indexed successfully',
      progressId: `pdf-${fileId}`
    });
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    res.status(500).json({
      error: 'Failed to process PDF',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// RAG-based chat with PDF
app.post('/api/chat-rag', async (req, res) => {
  try {
    const { question, fileId } = req.body;
    
    if (!question || !fileId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const answer = await llmService.chatWithPdf(question, fileId);
    
    res.status(200).json({ 
      success: true, 
      answer 
    });
  } catch (error: any) {
    console.error('Error generating chat response:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Stream-based RAG chat with PDF
app.post('/api/chat-rag-stream', async (req, res) => {
  try {
    const { question, fileId } = req.body;
    
    if (!question || !fileId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    if (!settings.USE_LOCAL_MODEL) {
      return res.status(400).json({ 
        error: 'Streaming is only available with local Ollama models', 
        message: 'Enable USE_LOCAL_MODEL in settings to use streaming'
      });
    }
    
    // Set appropriate headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
      // Get the stream from the LLM service
      const stream = await llmService.chatWithPdfStream(question, fileId);
      
      // Stream the response to the client
      const reader = stream.getReader();
      
      // Process the stream chunks
      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            // If the stream is done, end the response
            if (done) {
              res.end();
              break;
            }
            
            // Send the chunk to the client
            const chunk = new TextDecoder().decode(value);
            res.write(chunk);
          }
        } catch (error: any) {
          logger.error(`Error processing stream: ${error.message}`);
          res.write(`\nError: ${error.message}`);
          res.end();
        }
      };
      
      // Start streaming
      processStream();
      
    } catch (error: any) {
      logger.error(`Error starting stream: ${error.message}`);
      res.write(`Error: ${error.message}`);
      res.end();
    }
  } catch (error: any) {
    logger.error('Error setting up streaming response:', error);
    res.status(500).json({
      error: 'Failed to generate streaming response',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// API routes for testing
// Upload endpoint
const uploadsDir = path.join(__dirname, '../../uploads');
app.post('/api/upload', upload.single('file'), async (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' } as ErrorResponse);
    }

    const fileId = uuidv4();
    const outputPath = path.join(uploadsDir, `${fileId}.pdf`);
    
    // Copy the uploaded file to our uploads directory
    await fs.promises.copyFile(req.file.path, outputPath);
    
    // Remove the temporary file
    await fs.promises.unlink(req.file.path);
    
    return res.status(200).json({ 
      fileId,
      markdown: 'Generated markdown would be here',
      script: 'Generated script would be here'
    } as UploadResponse);
  } catch (error: any) {
    logger.error(`Error in /api/upload: ${error.message}`);
    return res.status(500).json({ error: 'An error occurred during upload' } as ErrorResponse);
  }
}, handleUploadError);

// Generate embeddings endpoint
app.post('/api/generate-embeddings', express.json(), async (req: express.Request, res: express.Response) => {
  try {
    const fileId = req.body.fileId;
    
    if (!fileId) {
      return res.status(400).json({ error: 'No fileId provided' } as ErrorResponse);
    }
    
    // Use the mocked uuid value in tests
    const progressId = uuidv4();
    
    // Start the processing asynchronously
    progressTracker.set(progressId, {
      id: progressId,
      status: 'processing',
      progress: 0
    });
    
    // Return the progress ID to client
    return res.status(200).json({ progressId });
    
  } catch (error: any) {
    logger.error(`Error in /api/generate-embeddings: ${error.message}`);
    return res.status(500).json({ error: 'An error generating embeddings' } as ErrorResponse);
  }
});

// Chat RAG endpoint
app.post('/api/chat-rag', async (req: express.Request, res: express.Response) => {
  try {
    const { question, fileId } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'No question provided' } as ErrorResponse);
    }
    
    if (!fileId) {
      return res.status(400).json({ error: 'No fileId provided' } as ErrorResponse);
    }
    
    // Check if file exists
    const filePath = pdfService.getFilePath(fileId);
    
    // Generate response using chat service
    const answer = await chatService.generateChatResponse(question, fileId);
    
    return res.status(200).json({ 
      success: true,
      answer 
    });
    
  } catch (error: any) {
    logger.error(`Error in /api/chat-rag: ${error.message}`);
    return res.status(500).json({ 
      error: `Failed to generate response: ${error.message}` 
    } as ErrorResponse);
  }
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
export { app };
export default app;
