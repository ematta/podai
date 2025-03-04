import express, { Request, Response } from 'express';
import { upload, handleUploadError } from '../utils/fileMiddleware.js';
import { pdfService } from '../services/pdfService.js';
import { progressService } from '../services/progressService.js';
import { createLogger } from '../config/logger.js';

const router = express.Router();
const logger = createLogger('file-upload-routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Progress check endpoint
router.get('/progress/:fileId', (req: Request, res: Response) => {
  const { fileId } = req.params;
  const progress = progressService.getProgress(fileId);
  
  if (!progress) {
    return res.status(404).json({ error: 'No progress tracking found for this file' });
  }
  
  res.status(200).json(progress);
});

// File upload endpoint
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = await pdfService.saveFile(req.file);
    progressService.initProgress(fileId);

    // Send initial response with fileId
    res.status(202).json({ fileId, status: 'processing' });

    // Process the PDF asynchronously
    try {
      const filePath = pdfService.getFilePath(fileId);
      progressService.updateProgress(fileId, 50);
      const pdfData = await pdfService.parsePdf(filePath);
      progressService.completeProgress(fileId, {
        text: pdfData.text,
        pages: pdfData.numpages
      });
    } catch (error) {
      logger.error(`Error processing PDF: ${error}`);
      progressService.failProgress(fileId, 'Failed to process PDF file');
    }
  } catch (error) {
    logger.error(`Error handling file upload: ${error}`);
    res.status(500).json({ error: 'Failed to handle file upload' });
  }
}, handleUploadError);

export default router;
