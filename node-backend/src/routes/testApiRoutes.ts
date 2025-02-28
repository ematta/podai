import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as chatService from '../services/chatService.js';
import multer from 'multer';
import path from 'path';

// Define response types
interface ErrorResponse {
  error: string
}

interface ProgressResponse {
  id: string;
  status: string;
  progress: number;
  message?: string;
  result?: any;
  error?: any;
}

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a router
const router = express.Router();

// Map to store progress
const progressTracker = new Map<string, ProgressResponse>();

// Test upload endpoint
router.post('/upload', upload.single('file'), (req: express.Request, res: express.Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' } as ErrorResponse);
    }

    const fileId = uuidv4();

    return res.status(200).json({ 
      fileId,
      markdown: 'Test markdown',
      script: 'Test script'
    });
  } catch (error: any) {
    console.error(`Error in /upload: ${error.message}`);
    return res.status(500).json({ error: 'An error occurred during upload' } as ErrorResponse);
  }
});

// Test generate embeddings endpoint
router.post('/generate-embeddings', (req: express.Request, res: express.Response) => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: 'No fileId provided' } as ErrorResponse);
    }
    
    const progressId = uuidv4();
    
    // Start the processing asynchronously
    progressTracker.set(progressId, {
      id: progressId,
      status: 'processing',
      progress: 0,
      message: 'Starting...'
    });
    
    // Return the progress ID to client
    return res.status(200).json({ progressId });
    
  } catch (error: any) {
    console.error(`Error in /generate-embeddings: ${error.message}`);
    return res.status(500).json({ error: 'An error generating embeddings' } as ErrorResponse);
  }
});

// Test progress endpoint
router.get('/progress/:id', (req: express.Request, res: express.Response) => {
  const id = req.params.id;
  const progressData = progressTracker.get(id);
  
  if (!progressData) {
    return res.status(404).json({ error: 'No progress data found for this ID' } as ErrorResponse);
  }
  
  return res.status(200).json(progressData);
});

// Test chat endpoint
router.post('/chat-rag', async (req: express.Request, res: express.Response) => {
  try {
    const { question, fileId } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'No question provided' } as ErrorResponse);
    }
    
    if (!fileId) {
      return res.status(400).json({ error: 'No fileId provided' } as ErrorResponse);
    }
    
    // Just return the mock response for testing
    return res.status(200).json({ 
      success: true,
      answer: 'Generated chat response'
    });
    
  } catch (error: any) {
    console.error(`Error in /chat-rag: ${error.message}`);
    return res.status(500).json({ 
      error: `Failed to generate response: ${error.message}` 
    } as ErrorResponse);
  }
});

export default router;
