import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import app from '../server';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Mock services
vi.mock('../services/pdfService', () => ({
  extractTextFromPdf: vi.fn().mockResolvedValue('Extracted text'),
  generateMarkdownFromPdf: vi.fn().mockResolvedValue('Generated markdown'),
}));

vi.mock('../services/embeddingService', () => ({
  createEmbeddings: vi.fn().mockResolvedValue({
    documentEmbeddings: [{ text: 'test chunk', embedding: [0.1, 0.2, 0.3] }],
    progress: 100,
  }),
}));

vi.mock('../services/chatService', () => ({
  generateChatResponse: vi.fn().mockResolvedValue('Generated chat response'),
}));

vi.mock('../services/vectorStoreService', () => ({
  storeEmbeddings: vi.fn().mockResolvedValue('file123'),
  searchSimilarChunks: vi.fn().mockResolvedValue([
    { text: 'Similar chunk 1', score: 0.95 },
    { text: 'Similar chunk 2', score: 0.85 },
  ]),
}));

// Mock uuid generation
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-id-123'),
}));

// Mock fs operations
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      ...actual.promises,
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(Buffer.from('test file content')),
      mkdir: vi.fn().mockResolvedValue(undefined),
      access: vi.fn().mockImplementation(() => Promise.resolve()),
    },
  };
});

describe('API Routes', () => {
  let request;
  
  beforeEach(() => {
    request = supertest(app);
    vi.resetAllMocks();
  });
  
  // Create a temporary file for testing
  const testPdfPath = path.resolve('./test-uploads/test.pdf');
  
  describe('POST /api/upload', () => {
    it('should upload a PDF file and return a file ID', async () => {
      const response = await request
        .post('/api/upload')
        .attach('pdf', testPdfPath);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fileId');
      expect(response.body.fileId).toBeDefined();
    });
    
    it('should return 400 if no file is provided', async () => {
      const response = await request.post('/api/upload');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('POST /api/generate-embeddings', () => {
    it('should generate embeddings for a PDF and return progress ID', async () => {
      const response = await request
        .post('/api/generate-embeddings')
        .field('fileId', 'test-file-id');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('progressId');
      expect(response.body.progressId).toBe('test-id-123');
    });
    
    it('should return 400 if no fileId is provided', async () => {
      const response = await request.post('/api/generate-embeddings');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /api/progress/:id', () => {
    it('should return progress information', async () => {
      // Mock progress data in the progressMap
      global.progressMap = new Map();
      global.progressMap.set('test-id-123', {
        progress: 50,
        message: 'Processing PDF',
        status: 'pending',
      });
      
      const response = await request.get('/api/progress/test-id-123');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('progress', 50);
      expect(response.body).toHaveProperty('message', 'Processing PDF');
      expect(response.body).toHaveProperty('status', 'pending');
    });
    
    it('should return 404 if progress ID is not found', async () => {
      const response = await request.get('/api/progress/nonexistent-id');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('POST /api/chat-rag', () => {
    it('should generate a chat response using RAG', async () => {
      const response = await request
        .post('/api/chat-rag')
        .send({
          question: 'What is the main topic?',
          fileId: 'test-file-id',
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('answer', 'Generated chat response');
    });
    
    it('should return 400 if required params are missing', async () => {
      const response = await request
        .post('/api/chat-rag')
        .send({
          question: 'What is the main topic?',
          // Missing fileId
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
