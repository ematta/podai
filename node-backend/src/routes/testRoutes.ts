import express from 'express';
import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger.js';
import pdfParse from 'pdf-parse';
import { llmService } from '../services/llmService.js';

const router = express.Router();

/**
 * Route to load a test PDF directly from the test data directory
 */
router.post('/load-test-pdf', async (req, res) => {
    try {
        const { pdfPath } = req.body;
        
        if (!pdfPath) {
            return res.status(400).json({ error: 'Missing PDF path' });
        }
        
        // Security check - only allow access to PDFs in the test data directory
        const normalizedPath = path.normalize(pdfPath);
        if (!normalizedPath.includes('test/data') || !normalizedPath.endsWith('.pdf')) {
            return res.status(403).json({ error: 'Invalid PDF path' });
        }
        
        // Get the absolute path
        const fullPath = path.join(process.cwd(), normalizedPath);
        
        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'PDF not found' });
        }
        
        // Read the file
        const dataBuffer = fs.readFileSync(fullPath);
        const pdfData = await pdfParse(dataBuffer);
        
        // Process with LLM service
        const fileId = await llmService.storePdf(pdfData.text, path.basename(fullPath));
        
        logger.info(`Test PDF loaded: ${normalizedPath}, fileId: ${fileId}`);
        
        res.status(200).json({
            success: true,
            fileId,
            message: 'Test PDF loaded successfully',
            progressId: `pdf-${fileId}`
        });
    } catch (error: any) {
        logger.error(`Error loading test PDF: ${error.message}`);
        res.status(500).json({
            error: 'Failed to load test PDF',
            message: error.message || 'Unknown error occurred'
        });
    }
});

export default router;
