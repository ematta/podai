import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define potential .env file paths
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), `.env.${process.env.NODE_ENV}`),
  path.resolve(process.cwd(), `.env.${process.env.NODE_ENV}.local`)
];

// Load the first .env file that exists
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment variables from ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

// If no .env file was found, load with the default behavior
if (!process.env.DOTENV_LOADED) {
  dotenv.config();
  process.env.DOTENV_LOADED = 'true';
}

export default {
  isLoaded: process.env.DOTENV_LOADED === 'true'
};
