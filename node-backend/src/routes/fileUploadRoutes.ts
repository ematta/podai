import express from 'express';
import { upload, handleUploadError } from '../utils/fileMiddleware.js';

const router = express.Router();

// For now, this is just a placeholder to ensure the import works
// The actual implementation can be moved from server.ts to here later
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router;
