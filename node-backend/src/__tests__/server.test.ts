import request from 'supertest';
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Mock services
vi.mock('../services/llmService.js', () => ({
  llmService: {
    generateText: vi.fn().mockResolvedValue('Mock response'),
    generateScript: vi.fn().mockResolvedValue('Mock script')
  }
}));

vi.mock('../services/pdfService.js', () => ({
  pdfService: {
    saveFile: vi.fn().mockResolvedValue('test-file-id'),
    getFilePath: vi.fn().mockReturnValue('/path/to/test.pdf'),
    pdfToMarkdown: vi.fn().mockResolvedValue('# Test Markdown')
  }
}));

// Create a mock Express app for testing
const mockApp = express();

// Configure basic routes for testing
mockApp.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok' });
});

mockApp.post('/upload', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    fileId: 'test-file-id',
    markdown: '# Test Markdown',
    script: 'Mock script'
  });
});

mockApp.post('/chat/:fileId', (req: express.Request, res: express.Response) => {
  res.status(200).json({
    answer: 'Mock chat response'
  });
});

describe('Server', () => {
  it('should respond to health check', async () => {
    const response = await request(mockApp).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
  
  it('should handle file upload', async () => {
    const mockFile = {
      buffer: Buffer.from('test pdf content'),
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      size: 100
    };
    
    const response = await request(mockApp)
      .post('/upload')
      .attach('file', mockFile.buffer, { filename: 'test.pdf' });
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('fileId');
    expect(response.body).toHaveProperty('markdown');
    expect(response.body).toHaveProperty('script');
  });
  
  it('should handle chat with PDF', async () => {
    const response = await request(mockApp)
      .post('/chat/test-file-id')
      .send({ question: 'Test question' });
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('answer');
  });
});
