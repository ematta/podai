import { HfInference } from '@huggingface/inference';
import { settings } from '../config/settings.js';
import { createLogger } from '../config/logger.js';
import { ollamaService } from './ollamaService.js';

const logger = createLogger('llm-service');

class LLMService {
  private hf: HfInference | null = null;
  private modelName: string = settings.LLM_MODEL;
  private temperature: number = settings.LLM_TEMPERATURE;
  private maxLength: number = settings.LLM_MAX_LENGTH;
  private useLocalModel: boolean = settings.USE_LOCAL_MODEL;

  constructor() {
    logger.info(`Initializing LLM service for model: ${this.modelName}`);
    
    try {
      // Check if we're in a testing environment
      if (process.env.TESTING === 'TRUE') {
        logger.info('Testing environment detected, skipping model loading');
        return;
      }

      // Check if we should use local model
      if (this.useLocalModel) {
        logger.info('Using local model with Ollama');
        return;
      }

      // Initialize the Hugging Face client if token is available
      if (settings.HUGGINGFACE_API_TOKEN) {
        this.hf = new HfInference(settings.HUGGINGFACE_API_TOKEN);
        logger.info('Hugging Face client initialized successfully');
      } else {
        logger.warn('No Hugging Face API token provided, will use fallback mode');
      }
    } catch (error) {
      logger.error(`Error initializing LLM service: ${error}`);
      logger.warn('Using fallback mode for all LLM operations');
    }
  }

  private async generateText(prompt: string): Promise<string> {
    // Use local model if configured
    if (this.useLocalModel) {
      logger.debug('Using local model for text generation');
      return await ollamaService.generateText(prompt);
    }
    
    // Otherwise use Hugging Face
    if (!this.hf) {
      logger.warn('HuggingFace model not initialized, using fallback generation');
      return this.fallbackGeneration(prompt);
    }

    try {
      const response = await this.hf.textGeneration({
        model: this.modelName,
        inputs: prompt,
        parameters: {
          max_new_tokens: this.maxLength,
          temperature: this.temperature,
          return_full_text: true,
        }
      });

      return response.generated_text;
    } catch (error) {
      logger.error(`Error generating text: ${error}`);
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

  public async generateScript(markdownContent: string): Promise<string> {
    if (!markdownContent) {
      return '';
    }

    const systemPrompt = `You are an AI assistant that converts document content into a professional podcast script.
    The script should include a host and co-host, with natural dialogue.
    Format the script with HOST: and CO-HOST: prefixes for speakers, and include
    an introduction and conclusion.`;

    const userPrompt = `Create a podcast script based on the following document content:\n${markdownContent}`;

    try {
      let response;
      
      // If using local model, pass system prompt separately
      if (this.useLocalModel) {
        response = await ollamaService.generateText(userPrompt, systemPrompt);
      } else {
        // Format the prompt for Hugging Face models
        const formattedPrompt = `<s>[INST] ${systemPrompt}\n\n${userPrompt} [/INST]`;
        response = await this.generateText(formattedPrompt);
      }

      // Extract the generated text (removing the prompt part if needed)
      let script = response;
      if (!this.useLocalModel && response.includes('[/INST]')) {
        script = response.split('[/INST]')[1].trim();
      } else if (script.includes('# Podcast Script') || script.includes('**HOST:**')) {
        // Already in the right format
      } else {
        // Fallback in case the response format is unexpected
        script = this.fallbackScriptGeneration(markdownContent);
      }

      logger.info(`Generated script of length ${script.length}`);
      return script;
    } catch (error) {
      logger.error(`Error generating script: ${error}`);
      return this.fallbackScriptGeneration(markdownContent);
    }
  }

  public async chatWithPdf(question: string, pdfText: string): Promise<string> {
    if (!question || !pdfText) {
      return 'Please provide both a question and PDF content.';
    }

    // Truncate PDF text if it's too long
    const maxPdfChars = 24000; // Example limit
    const truncatedPdf = pdfText.length > maxPdfChars ? 
      pdfText.substring(0, maxPdfChars) + '... [document truncated due to length]' : pdfText;

    const systemPrompt = `You are an AI assistant that answers questions based on the content of a document.
    Analyze the document content and provide accurate answers to questions.
    If the answer is not in the document, say so clearly.
    Always be factual and refer to the document content.`;

    const userPrompt = `Document content:
    ${truncatedPdf}

    Question: ${question}`;

    try {
      let response;
      
      // If using local model, pass system prompt separately
      if (this.useLocalModel) {
        response = await ollamaService.generateText(userPrompt, systemPrompt);
      } else {
        // Format the prompt for Hugging Face models
        const formattedPrompt = `<s>[INST] ${systemPrompt}\n\n${userPrompt} [/INST]`;
        response = await this.generateText(formattedPrompt);
      }

      // Extract the generated text
      let answer = response;
      if (!this.useLocalModel && response.includes('[/INST]')) {
        answer = response.split('[/INST]')[1].trim();
      }

      logger.info(`Generated answer of length ${answer.length}`);
      return answer;
    } catch (error) {
      logger.error(`Error generating answer: ${error}`);
      return `I'm sorry, I couldn't process your question about the document. ${error}`;
    }
  }

  private fallbackScriptGeneration(markdownContent: string): string {
    logger.warn('Using fallback script generation');
    let script = "# Podcast Script\n\n";
    script += "**HOST:** Welcome to our podcast! Today we're discussing some interesting content.\n\n";

    // Add document paragraphs to script in a conversational format
    const paragraphs = markdownContent.split('\n\n');
    for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
      const para = paragraphs[i].trim();
      if (!para) continue;

      if (i % 2 === 0) {
        script += `**HOST:** ${para}\n\n`;
      } else {
        script += `**CO-HOST:** That's interesting! ${para}\n\n`;
      }
    }

    script += "**HOST:** Thanks for listening to our podcast! Don't forget to subscribe.\n";
    return script;
  }
}

// Initialize the LLM service
export const llmService = new LLMService();
