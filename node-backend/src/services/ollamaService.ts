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
    num_ctx?: number;
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
  private contextWindow: number;

  constructor() {
    this.baseUrl = settings.OLLAMA_BASE_URL;
    this.modelName = settings.OLLAMA_MODEL;
    this.temperature = settings.LLM_TEMPERATURE;
    this.maxLength = settings.LLM_MAX_LENGTH;
    this.contextWindow = settings.OLLAMA_CONTEXT_WINDOW;

    logger.info(`Initializing Ollama service for model: ${this.modelName} at ${this.baseUrl} with ${this.contextWindow} context window`);
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

      // Configure context window for long content
      params.options = {
        ...params.options,
        num_ctx: this.contextWindow
      };

      logger.debug(`Generating text with Ollama model: ${this.modelName}, context window: ${this.contextWindow}`);
      
      try {
        const response = await axios.post<OllamaGenerateResponse>(
          `${this.baseUrl}/api/generate`, 
          params
        );
  
        return response.data.response;
      } catch (e: any) {
        // Check for context window related errors
        if (e.response?.data?.error && 
            (e.response.data.error.includes('context window') || 
             e.response.data.error.includes('tokens exceed') ||
             e.response.data.error.includes('out of memory'))) {
          
          logger.warn(`Context window error, reducing window size and retrying: ${e.response.data.error}`);
          
          // Try again with smaller context window
          const reducedCtx = Math.floor(this.contextWindow * 0.75); // Reduce by 25%
          params.options.num_ctx = reducedCtx;
          
          logger.info(`Retrying with reduced context window: ${reducedCtx}`);
          
          try {
            const retryResponse = await axios.post<OllamaGenerateResponse>(
              `${this.baseUrl}/api/generate`, 
              params
            );
            
            return retryResponse.data.response;
          } catch (retryError: any) {
            // If retry also fails, throw a more detailed error
            const errorMessage = retryError.response?.data?.error || retryError.message;
            throw new Error(`Ollama generation failed even with reduced context: ${errorMessage}`);
          }
        }
        
        // For other errors, format the error message to be more informative
        const errorMessage = e.response?.data?.error || e.message;
        throw new Error(`Ollama generation failed: ${errorMessage}`);
      }
    } catch (error: any) {
      logger.error(`Error generating text with Ollama: ${error.message}`);
      throw error; // Re-throw the error to be handled by the caller
    }
  }
}

// Initialize the Ollama service
export const ollamaService = new OllamaService();
