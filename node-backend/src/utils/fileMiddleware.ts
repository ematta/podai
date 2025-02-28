import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { settings } from '../config/settings.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('file-middleware');

// Configure multer for file storage
const storage = multer.memoryStorage();

// Create multer instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: settings.MAX_UPLOAD_SIZE
  },
  fileFilter: (req, file, cb) => {
    // Check if file is a PDF
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  }
});

// Error handler for file upload
export const handleUploadError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      logger.warn(`File size limit exceeded: ${err.message}`);
      return res.status(413).json({ 
        error: 'File size limit exceeded',
        maxSize: `${settings.MAX_UPLOAD_SIZE / (1024 * 1024)}MB` 
      });
    }
    logger.error(`Multer error: ${err.message}`);
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message === 'Only PDF files are allowed') {
    logger.warn(`Invalid file type: ${err.message}`);
    return res.status(415).json({ error: err.message });
  }
  
  logger.error(`Unexpected error in file upload: ${err}`);
  return res.status(500).json({ error: 'An unexpected error occurred while uploading the file' });
};
