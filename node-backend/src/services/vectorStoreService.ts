import { createLogger } from '../config/logger.js';
import { pipeline } from '@xenova/transformers';
import fs from 'fs';

const logger = createLogger('vector-store-service');

// In-memory vector store
interface Document {
  pageContent: string;
  metadata: {
    fileId?: string;
    source?: string;
    index?: number;
  };
  embedding?: number[];
}

interface QueryResult {
  document: Document;
  score: number;
}

class VectorStoreService {
  private embeddings: Map<string, Document[]> = new Map();
  private embeddingModel: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    logger.info('Initializing vector store service');
    this.initPromise = this.initialize();
  }
  
  private async initialize(): Promise<void> {
    try {
      logger.info('Loading embedding model...');
      
      // Use Xenova's pipeline for sentence embeddings
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      
      this.isInitialized = true;
      logger.info('Vector store service initialized successfully');
    } catch (error: any) {
      logger.error(`Failed to initialize vector store: ${error.message}`);
      throw error;
    }
  }
  
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      if (this.initPromise) {
        await this.initPromise;
      } else {
        await this.initialize();
      }
    }
  }
  
  // Generate embeddings for text
  private async generateEmbeddings(text: string): Promise<number[]> {
    await this.ensureInitialized();
    
    try {
      const result = await this.embeddingModel(text, {
        pooling: 'mean',
        normalize: true
      });
      
      return Array.from(result.data);
    } catch (error: any) {
      logger.error(`Error generating embeddings: ${error.message}`);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }
  
  // Split text into chunks
  private splitText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    try {
      // Simple splitter based on paragraphs and character count
      const chunks: string[] = [];
      const paragraphs = text.split(/\n\s*\n/);
      
      let currentChunk = '';
      
      for (const paragraph of paragraphs) {
        if (paragraph.trim().length === 0) continue;
        
        if (currentChunk.length + paragraph.length < chunkSize) {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
            
            // Add overlap by keeping the end of the previous chunk
            if (overlap > 0 && currentChunk.length > overlap) {
              currentChunk = currentChunk.substring(currentChunk.length - overlap);
            } else {
              currentChunk = '';
            }
          }
          
          // If a single paragraph is too big, split it further
          if (paragraph.length > chunkSize) {
            const sentences = paragraph.split(/(?<=\.|\?|\!)\s+/);
            let sentenceChunk = '';
            
            for (const sentence of sentences) {
              if (sentenceChunk.length + sentence.length < chunkSize) {
                sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
              } else {
                if (sentenceChunk) {
                  chunks.push(sentenceChunk);
                  
                  // Add overlap for sentences too
                  if (overlap > 0 && sentenceChunk.length > overlap) {
                    sentenceChunk = sentenceChunk.substring(sentenceChunk.length - overlap);
                  } else {
                    sentenceChunk = '';
                  }
                }
                
                if (sentence.length > chunkSize) {
                  // For very long sentences, just split by character count
                  for (let i = 0; i < sentence.length; i += chunkSize - overlap) {
                    const chunk = sentence.substring(i, i + chunkSize);
                    chunks.push(chunk);
                  }
                } else {
                  sentenceChunk = sentence;
                }
              }
            }
            
            if (sentenceChunk) {
              chunks.push(sentenceChunk);
            }
          } else {
            currentChunk += paragraph;
          }
        }
      }
      
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      return chunks;
    } catch (error: any) {
      logger.error(`Error splitting text: ${error.message}`);
      throw new Error(`Failed to split text: ${error.message}`);
    }
  }
  
  // Add a document to the vector store
  public async addDocument(fileId: string, text: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      logger.info(`Adding document ${fileId} to vector store`);
      
      // Split the document into chunks
      const chunks = this.splitText(text);
      logger.info(`Split document into ${chunks.length} chunks`);
      
      const documents: Document[] = [];
      
      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbeddings(chunk);
        
        documents.push({
          pageContent: chunk,
          metadata: {
            fileId,
            source: `chunk-${i}`,
            index: i
          },
          embedding
        });
      }
      
      // Store the documents
      this.embeddings.set(fileId, documents);
      logger.info(`Successfully added document ${fileId} to vector store`);
      
      // Save embeddings to disk (optional)
      this.saveEmbeddingsToDisk(fileId);
    } catch (error: any) {
      logger.error(`Error adding document to vector store: ${error.message}`);
      throw new Error(`Failed to add document to vector store: ${error.message}`);
    }
  }
  
  // Save embeddings to disk
  private saveEmbeddingsToDisk(fileId: string): void {
    try {
      const documents = this.embeddings.get(fileId);
      if (!documents) return;
      
      const embeddingsDir = './data/embeddings';
      if (!fs.existsSync(embeddingsDir)) {
        fs.mkdirSync(embeddingsDir, { recursive: true });
      }
      
      fs.writeFileSync(
        `${embeddingsDir}/${fileId}.json`,
        JSON.stringify(documents)
      );
      
      logger.info(`Saved embeddings for ${fileId} to disk`);
    } catch (error: any) {
      logger.warn(`Failed to save embeddings to disk: ${error.message}`);
    }
  }
  
  // Compute cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  // Search for similar documents
  public async similaritySearch(
    fileId: string,
    query: string,
    k: number = 5
  ): Promise<Document[]> {
    await this.ensureInitialized();
    
    try {
      const documents = this.embeddings.get(fileId);
      if (!documents || documents.length === 0) {
        logger.warn(`No embeddings found for file ${fileId}`);
        return [];
      }
      
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbeddings(query);
      
      // Calculate similarity scores
      const results: QueryResult[] = documents
        .map(doc => ({
          document: doc,
          score: this.cosineSimilarity(queryEmbedding, doc.embedding!)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
      
      logger.info(`Found ${results.length} similar documents for query in file ${fileId}`);
      
      return results.map(r => r.document);
    } catch (error: any) {
      logger.error(`Error performing similarity search: ${error.message}`);
      throw new Error(`Failed to perform similarity search: ${error.message}`);
    }
  }
  
  // Check if embeddings exist for a file
  public hasEmbeddings(fileId: string): boolean {
    const documents = this.embeddings.get(fileId);
    return !!documents && documents.length > 0;
  }
  
  // Get the number of chunks for a file
  public getChunkCount(fileId: string): number {
    const documents = this.embeddings.get(fileId);
    return documents?.length || 0;
  }
  
  // Get all embeddings for a file
  public getEmbeddings(fileId: string): Document[] | null {
    return this.embeddings.get(fileId) || null;
  }
  
  // Delete embeddings for a file
  public deleteEmbeddings(fileId: string): boolean {
    return this.embeddings.delete(fileId);
  }
}

// Export a singleton instance
export const vectorStoreService = new VectorStoreService();
