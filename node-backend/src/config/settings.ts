import './env.js'; // Import first to ensure variables are loaded
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Settings {
  // Server settings
  public readonly PORT: number = parseInt(process.env.PORT || '8081', 10);
  public readonly NODE_ENV: string = process.env.NODE_ENV || 'development';
  public readonly LOG_LEVEL: string = process.env.LOG_LEVEL || 'info';

  // Upload settings
  public readonly UPLOAD_FOLDER: string = process.env.UPLOAD_FOLDER || 'uploads';
  public readonly MAX_UPLOAD_SIZE: number = parseInt(process.env.MAX_UPLOAD_SIZE || '16777216', 10); // 16MB

  // LLM settings
  public readonly HUGGINGFACE_API_TOKEN: string | undefined = process.env.HUGGINGFACE_API_TOKEN;
  public readonly LLM_MODEL: string = process.env.LLM_MODEL || 'ibm-granite/granite-3.2-8b-instruct';
  public readonly LLM_TEMPERATURE: number = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
  public readonly LLM_MAX_LENGTH: number = parseInt(process.env.LLM_MAX_LENGTH || '2048', 10);

  // Ollama settings for local model inference
  public readonly USE_LOCAL_MODEL: boolean = process.env.USE_LOCAL_MODEL === 'true';
  public readonly OLLAMA_BASE_URL: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  public readonly OLLAMA_MODEL: string = process.env.OLLAMA_MODEL || 'granite';

  constructor() {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.resolve(path.join(path.dirname(__dirname), '..'), this.UPLOAD_FOLDER);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }
}

// Export a singleton instance
export const settings = new Settings();
