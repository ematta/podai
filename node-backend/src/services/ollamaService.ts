import axios from 'axios';
import { settings } from '../config/settings.js';
import { createLogger } from '../config/logger.js';

const logger = createLogger('ollama-service');

interface OllamaGenerateParams {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

class OllamaService {
  private baseUrl: string;
  private modelName: string;
  private temperature: number;
  private maxLength: number;

  constructor() {
    this.baseUrl = settings.OLLAMA_BASE_URL;
    this.modelName = settings.OLLAMA_MODEL;
    this.temperature = settings.LLM_TEMPERATURE;
    this.maxLength = settings.LLM_MAX_LENGTH;

    logger.info(`Initializing Ollama service for model: ${this.modelName} at ${this.baseUrl}`);
    this.checkModelAvailability();
  }

  private async checkModelAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];
      const isAvailable = models.some((model: any) => model.name === this.modelName);
      
      if (isAvailable) {
        logger.info(`Model ${this.modelName} is available in Ollama`);
      } else {
        logger.warn(`Model ${this.modelName} is not available in Ollama. You may need to run: ollama pull ${this.modelName}`);
      }
      
      return isAvailable;
    } catch (error) {
      logger.error(`Error checking Ollama model availability: ${error}`);
      logger.warn('Make sure Ollama is running on your machine at ' + this.baseUrl);
      return false;
    }
  }

  public async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const params: OllamaGenerateParams = {
        model: this.modelName,
        prompt,
        options: {
          temperature: this.temperature,
          num_predict: this.maxLength
        }
      };
      
      // Add system prompt if provided
      if (systemPrompt) {
        params.system = systemPrompt;
      }

      logger.debug(`Generating text with Ollama model: ${this.modelName}`);
      const response = await axios.post<OllamaGenerateResponse>(
        `${this.baseUrl}/api/generate`, 
        params
      );

      return response.data.response;
    } catch (error) {
      logger.error(`Error generating text with Ollama: ${error}`);
      return this.fallbackGeneration(prompt);
    }
  }

  private fallbackGeneration(prompt: string): string {
    // Extract user's question or content from chat format
    if (prompt.includes('[INST]') && prompt.includes('[/INST]')) {
      const content = prompt.split('[INST]')[1].split('[/INST]')[0].trim();
      if (content.includes('Question:')) {
        const question = content.split('Question:')[1].trim();
        return `${prompt}\n\nBased on the document, I can tell you that the answer relates to ${question}, but I don't have more specific details.`;
      }
    }

    // For script generation
    return `${prompt}\n\n# Podcast Script\n\n**HOST:** Welcome to our podcast!\n\n**HOST:** Today we're discussing some fascinating content.\n\n**CO-HOST:** That's really interesting!\n\n**HOST:** Thanks for listening!`;
  }
}

// Initialize the Ollama service
export const ollamaService = new OllamaService();
