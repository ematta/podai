import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
import { settings } from '../config/settings.js';
import { createLogger } from '../config/logger.js';
import { ollamaService } from './ollamaService.js';
import { vectorStoreService } from './vectorStoreService.js';
import { v4 as uuidv4 } from 'uuid';
import { ProgressTracker } from '../utils/progressTracker.js';

// Initialize logger
const logger = createLogger('llm-service');

// Token limit constants
const HF_MAX_TOTAL_TOKENS = 8192; // Increase this to allow for larger context windows
// Use a more conservative estimate - some models count tokens differently
const APPROX_CHARS_PER_TOKEN = 3.5; 

// Temporary storage for PDF content
interface PdfStore {
  [fileId: string]: {
    content: string;
    filename: string;
    timestamp: number;
  }
}

class LLMService {
  private hf: HfInference | null = null;
  private modelName: string = settings.LLM_MODEL;
  private temperature: number = settings.LLM_TEMPERATURE;
  private maxLength: number = settings.LLM_MAX_LENGTH;
  private useLocalModel: boolean = settings.USE_LOCAL_MODEL;
  private pdfStore: PdfStore = {};

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
      try {
        return await ollamaService.generateText(prompt);
      } catch (error: any) {
        logger.error(`Error using local model: ${error.message}`);
        throw new Error(`Failed to generate text with local model: ${error.message}`);
      }
    }
    
    // Otherwise use Hugging Face
    if (!this.hf) {
      logger.error('HuggingFace model not initialized and local model not enabled');
      throw new Error('No text generation model available. Please configure a valid model.');
    }

    // Token limit handling
    const promptTokens = Math.ceil(prompt.length / APPROX_CHARS_PER_TOKEN);
    // Be more conservative with the max tokens allocation
    const maxResponseTokens = Math.min(
      Math.floor((HF_MAX_TOTAL_TOKENS - promptTokens) * 0.9), // Use 90% of remaining tokens instead of 80%
      this.maxLength
    );
    
    logger.debug(`Estimated prompt tokens: ${promptTokens}, max response tokens: ${maxResponseTokens}`);
    
    // If we can't allocate enough tokens for a meaningful response, throw an error
    if (maxResponseTokens < 100) {
      logger.error('Input too large for model context window');
      throw new Error('The input is too large for the model context window. Please reduce the input size.');
    }

    try {
      const response = await this.hf.textGeneration({
        model: this.modelName,
        inputs: prompt,
        parameters: {
          max_new_tokens: maxResponseTokens,
          temperature: this.temperature,
          return_full_text: true,
        }
      });

      return response.generated_text;
    } catch (error: any) {
      logger.error(`Error generating text: ${error.message}`);
      
      // Check for token limit errors
      if (error.message && 
         (error.message.includes('Input validation error') || 
          error.message.includes('tokens must be <=') || 
          error.message.includes('exceed maximum context length'))) {
        
        logger.warn('Token limit exceeded, attempting with reduced output tokens');
        
        try {
          // Try again with even fewer output tokens
          const reducedTokens = Math.floor(maxResponseTokens * 0.5); // 50% of previous token count
          
          if (reducedTokens < 50) {
            throw new Error('Input is too large for model even after reduction. Please provide shorter content.');
          }
          
          const retryResponse = await this.hf.textGeneration({
            model: this.modelName,
            inputs: prompt,
            parameters: {
              max_new_tokens: reducedTokens,
              temperature: this.temperature,
              return_full_text: true,
            }
          });
          
          return retryResponse.generated_text;
        } catch (retryError: any) {
          logger.error(`Error in retry generation: ${retryError.message}`);
          throw new Error(`Failed to generate text even with reduced tokens: ${retryError.message}`);
        }
      }
      
      // For other errors, rethrow with more context
      throw new Error(`Failed to generate text: ${error.message}`);
    }
  }

  public async generateScript(markdownContent: string): Promise<string> {
    if (!markdownContent) {
      return '';
    }

    const systemPrompt = `You are an AI assistant that converts document content into a professional podcast script.
    The script should include a host and co-host, with natural dialogue.
    Format the script with HOST: and CO-HOST: prefixes for speakers, and include
    an introduction and conclusion.`;

    // Calculate available space for content more conservatively
    const maxContentChars = this.useLocalModel 
      ? 45000 // Generous limit for Ollama with 16k context window
      : Math.floor((HF_MAX_TOTAL_TOKENS * 0.7) * APPROX_CHARS_PER_TOKEN); // Reserve 30% for system prompt and output
    
    // Log the content length for better debugging
    logger.info(`Original markdown content length: ${markdownContent.length} chars, max allowed: ${maxContentChars}`);
    
    // Truncate markdown if needed
    const truncatedMarkdown = markdownContent.length > maxContentChars 
      ? markdownContent.substring(0, maxContentChars) + '... [content truncated]' 
      : markdownContent;
      
    logger.info(`Truncated to ${truncatedMarkdown.length} chars (${Math.round((truncatedMarkdown.length / APPROX_CHARS_PER_TOKEN))} estimated tokens)`);

    const userPrompt = `Create a podcast script based on the following document content:\n${truncatedMarkdown}`;

    try {
      let response;
      
      // If content is excessively large for HF API and we're not using local model,
      // use fallback directly to avoid token limit errors
      if (!this.useLocalModel && 
          truncatedMarkdown.length > (HF_MAX_TOTAL_TOKENS * 0.85 * APPROX_CHARS_PER_TOKEN)) {
        logger.warn('Content is too large for Hugging Face API, using fallback script generation');
        return this.fallbackScriptGeneration(markdownContent);
      }
      
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
        // If response format is unexpected, still use it but try to format it
        logger.warn('Unexpected script format received, attempting to format');
        if (!script.includes('HOST:') && !script.includes('**HOST:**')) {
          script = "# Podcast Script\n\n**HOST:** Welcome to our podcast!\n\n" + script;
        }
      }

      logger.info(`Generated script of length ${script.length}`);
      return script;
    } catch (error: any) {
      logger.error(`Error generating script: ${error.message}`);
      
      // Explain the error but still provide some content using fallbackScriptGeneration
      const errorMessage = `We encountered an error while generating your podcast script: ${error.message}\n\nHere's a basic script we created based on your content:\n\n`;
      return errorMessage + this.fallbackScriptGeneration(markdownContent);
    }
  }

  // Store PDF content and generate embeddings
  public async storePdf(content: string, filename: string): Promise<string> {
    // Generate a unique ID for this PDF
    const fileId = uuidv4();
    
    // Start progress tracking
    ProgressTracker.createProgress(`pdf-${fileId}`, 'Processing PDF content');
    
    try {
      logger.info(`Processing PDF: "${filename}" (ID: ${fileId})`);
      
      // Store the PDF content in memory
      this.pdfStore[fileId] = {
        content,
        filename,
        timestamp: Date.now()
      };
      
      ProgressTracker.updateProgress(`pdf-${fileId}`, 10, 'Analyzing PDF content...');
      
      // Generate embeddings for the PDF content
      ProgressTracker.updateProgress(`pdf-${fileId}`, 30, 'Generating embeddings for PDF content');
      await vectorStoreService.addDocument(fileId, content);
      
      ProgressTracker.updateProgress(`pdf-${fileId}`, 90, 'Finalizing...');
      
      logger.info(`✅ PDF "${filename}" (ID: ${fileId}) is processed and ready for chat`);
      logger.info(`📊 Created ${vectorStoreService.getChunkCount(fileId) || 0} chunks for RAG`);
      
      ProgressTracker.updateProgress(`pdf-${fileId}`, 100, 'PDF processed and ready for chat');
      ProgressTracker.completeProgress(`pdf-${fileId}`);
      
      return fileId;
    } catch (error: any) {
      logger.error(`Error storing PDF: ${error.message}`);
      ProgressTracker.failProgress(`pdf-${fileId}`, error.message || 'Unknown error');
      throw error;
    }
  }
  
  // RAG chat with PDF using vector store
  public async chatWithPdf(question: string, fileIdOrText: string): Promise<string> {
    // Check if the first parameter is a file ID (for RAG) or PDF text content
    const isFileId = fileIdOrText.length < 100; // Simple heuristic - file IDs are shorter than PDF content
    
    if (isFileId) {
      // RAG-based approach
      if (!question || !fileIdOrText) {
        return 'Please provide both a question and a valid PDF ID.';
      }
      
      // Check if we have the PDF stored
      if (!this.pdfStore[fileIdOrText]) {
        return 'PDF not found. Please upload the PDF first.';
      }
      
      // Check if we have embeddings for this PDF
      if (!vectorStoreService.hasEmbeddings(fileIdOrText)) {
        logger.info(`No embeddings found for file ${fileIdOrText}, generating them now`);
        try {
          await vectorStoreService.addDocument(fileIdOrText, this.pdfStore[fileIdOrText].content);
        } catch (error: any) {
          logger.error(`Error generating embeddings: ${error.message}`);
          return `Error preparing document for chat: ${error.message}`;
        }
      }
      
      try {
        // Perform similarity search to find relevant chunks
        const relevantDocs = await vectorStoreService.similaritySearch(fileIdOrText, question, 5);
        
        if (relevantDocs.length === 0) {
          return "I couldn't find any relevant information in the document to answer your question.";
        }
        
        // Combine the relevant chunks into context
        const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
        
        // Log information
        logger.info(`Retrieved ${relevantDocs.length} relevant chunks with total length ${context.length} chars`);
        
        const systemPrompt = `You are an AI assistant that answers questions based on the specific sections of a document provided below.
        Analyze the document content and provide accurate answers to the question.
        If the answer is not in the provided sections, say so clearly.
        Always be factual and refer only to the provided content.`;
        
        const userPrompt = `Document sections:
        ${context}
        
        Question: ${question}`;
        
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
        
        logger.info(`Generated RAG answer of length ${answer.length}`);
        return answer;
        
      } catch (error: any) {
        logger.error(`Error in RAG chat: ${error.message}`);
        
        // Create a more helpful error message based on the error type
        if (error.message.includes('context window') || 
            error.message.includes('tokens exceed') || 
            error.message.includes('out of memory')) {
          return `I'm sorry, I encountered a limitation while processing your question. Try asking about a more specific aspect of the document. Error details: ${error.message}`;
        } else if (error.message.includes('Failed to connect') || 
                  error.message.includes('ECONNREFUSED') || 
                  error.message.includes('network')) {
          return `I'm having trouble connecting to the language model service. Please check if the service is running and accessible. Error details: ${error.message}`;
        } else {
          return `I encountered an error while processing your question about the document. Please try again or check your configuration. Error details: ${error.message}`;
        }
      }
    } else {
      // Traditional approach - fileIdOrText contains the PDF text
      const pdfText = fileIdOrText;
      if (!question || !pdfText) {
        return 'Please provide both a question and PDF content.';
      }
      
      // Determine max PDF chars based on model more conservatively
      const maxPdfChars = this.useLocalModel 
        ? 50000 // Very generous for Ollama with 16k context
        : Math.floor((HF_MAX_TOTAL_TOKENS * 0.6) * APPROX_CHARS_PER_TOKEN); // Reserve 40% for system prompt, question, and response
      
      // Log the PDF length for better debugging
      logger.info(`Original PDF length: ${pdfText.length} chars, max allowed: ${maxPdfChars}`);
      
      const truncatedPdf = pdfText.length > maxPdfChars 
        ? pdfText.substring(0, maxPdfChars) + '... [document truncated due to length]' 
        : pdfText;

      // Log information about content length
      logger.info(`Truncated to ${truncatedPdf.length} chars (${Math.round((truncatedPdf.length / APPROX_CHARS_PER_TOKEN))} estimated tokens)`);
      logger.info(`Using ${this.useLocalModel ? 'local Ollama' : 'Hugging Face'} model with max content length of ${maxPdfChars} chars`);

      const systemPrompt = `You are an AI assistant that answers questions based on the content of a document.
      Analyze the document content and provide accurate answers to questions.
      If the answer is not in the document, say so clearly.
      Always be factual and refer to the document content.`;

      const userPrompt = `Document content:
      ${truncatedPdf}

      Question: ${question}`;

      try {
        let response;
        
        // If PDF content is excessively large for HF API and we're not using local model,
        // respond with a message about content size limitations
        if (!this.useLocalModel && 
            truncatedPdf.length > (HF_MAX_TOTAL_TOKENS * 0.85 * APPROX_CHARS_PER_TOKEN)) {
          logger.warn('Content is too large for Hugging Face API, suggesting local model');
          return 'The document you provided is too large to process with the current API model. ' +
                'Consider enabling the local model option in your .env file by setting USE_LOCAL_MODEL=true ' +
                'for processing larger documents.';
        }
        
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
      } catch (error: any) {
        logger.error(`Error generating answer: ${error.message}`);
        
        // Create a more helpful error message based on the error type
        if (error.message.includes('context window') || 
            error.message.includes('tokens exceed') || 
            error.message.includes('out of memory')) {
          return `I'm sorry, the document is too large for me to process in one go. Please try asking about a specific section or provide a shorter document. Error details: ${error.message}`;
        } else if (error.message.includes('Failed to connect') || 
                  error.message.includes('ECONNREFUSED') || 
                  error.message.includes('network')) {
          return `I'm having trouble connecting to the language model service. Please check if Ollama is running on your machine and is accessible. Error details: ${error.message}`;
        } else {
          return `I encountered an error while processing your question about the document. Please try again or check your configuration. Error details: ${error.message}`;
        }
      }
    }
  }

  // Stream-based RAG chat with PDF 
  public async chatWithPdfStream(question: string, fileId: string): ReadableStream<Uint8Array> {
    if (!question || !fileId) {
      throw new Error('Please provide both a question and a valid PDF ID.');
    }
    
    // Check if we are using local model - streaming only works with Ollama
    if (!this.useLocalModel) {
      throw new Error('Streaming responses are only available when using a local model with Ollama.');
    }
    
    // Check if we have the PDF stored
    if (!this.pdfStore[fileId]) {
      throw new Error('PDF not found. Please upload the PDF first.');
    }
    
    // Check if we have embeddings for this PDF
    if (!vectorStoreService.hasEmbeddings(fileId)) {
      logger.info(`No embeddings found for file ${fileId}, generating them now`);
      try {
        await vectorStoreService.addDocument(fileId, this.pdfStore[fileId].content);
      } catch (error: any) {
        logger.error(`Error generating embeddings: ${error.message}`);
        throw new Error(`Error preparing document for chat: ${error.message}`);
      }
    }
    
    try {
      // Perform similarity search to find relevant chunks
      const relevantDocs = await vectorStoreService.similaritySearch(fileId, question, 5);
      
      if (relevantDocs.length === 0) {
        throw new Error("I couldn't find any relevant information in the document to answer your question.");
      }
      
      // Combine the relevant chunks into context
      const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
      
      // Log information
      logger.info(`Retrieved ${relevantDocs.length} relevant chunks with total length ${context.length} chars`);
      
      const systemPrompt = `You are an AI assistant that answers questions based on the specific sections of a document provided below.
      Analyze the document content and provide accurate answers to the question.
      If the answer is not in the provided sections, say so clearly.
      Always be factual and refer only to the provided content.`;
      
      const userPrompt = `Document sections:
      ${context}
      
      Question: ${question}`;
      
      // Get a streaming response from Ollama
      return ollamaService.generateTextStream(userPrompt, systemPrompt);
      
    } catch (error: any) {
      // Create a TransformStream to return error as a stream
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      writer.write(new TextEncoder().encode(`Error: ${error.message}`));
      writer.close();
      return readable;
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
