import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

// Set testing environment
process.env.NODE_ENV = 'test';
process.env.TESTING = 'TRUE';
process.env.LOG_LEVEL = 'error'; // Minimize logs during tests

// Mock environment variables for testing
process.env.PORT = '8082'; // Different port for tests
process.env.UPLOAD_FOLDER = 'test-uploads';
process.env.LLM_MODEL = 'test-model';

// Create test uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(path.resolve(__dirname, '../..'), 'test-uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
