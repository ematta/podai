import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../config/logger.js';
import { settings } from '../config/settings.js';

// Define PDF data interface
interface PDFData {
  text: string;
  numpages: number;
  info: Record<string, any>;
  metadata: any;
  version?: string;
}

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('pdf-service');

// Define the pdfParse function type
type PdfParseFunction = (dataBuffer: Buffer) => Promise<PDFData>;

// Import pdf-parse with error handling
let pdfParse: PdfParseFunction;
try {
  pdfParse = (await import('pdf-parse')).default;
} catch (error) {
  logger.error(`Error importing pdf-parse: ${error}`);
  // Create a mock implementation if the real one fails to load
  pdfParse = async (dataBuffer: Buffer) => {
    return {
      text: 'Error: PDF parsing not available',
      numpages: 0,
      info: {},
      metadata: null,
      version: '0',
    };
  };
}

class PdfService {
  private uploadFolder: string;

  constructor() {
    this.uploadFolder = path.resolve(path.join(path.dirname(__dirname), '..'), settings.UPLOAD_FOLDER);
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadFolder)) {
      fs.mkdirSync(this.uploadFolder, { recursive: true });
    }
  }

  /**
   * Save uploaded file to the uploads directory
   */
  public async saveFile(file: Express.Multer.File): Promise<string> {
    const fileId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = path.join(this.uploadFolder, fileName);

    try {
      // Create a write stream
      const writeStream = fs.createWriteStream(filePath);
      
      return new Promise((resolve, reject) => {
        // Write the file buffer to the stream
        writeStream.write(file.buffer);
        writeStream.end();
        
        writeStream.on('finish', () => {
          logger.info(`File saved successfully: ${filePath}`);
          resolve(fileId);
        });
        
        writeStream.on('error', (err) => {
          logger.error(`Error saving file: ${err}`);
          reject(err);
        });
      });
    } catch (error) {
      logger.error(`Error saving file: ${error}`);
      throw new Error(`Could not save file: ${error}`);
    }
  }

  /**
   * Get file path by ID
   */
  public getFilePath(fileId: string): string {
    // Look for any file with this ID (regardless of extension)
    const files = fs.readdirSync(this.uploadFolder);
    const file = files.find(file => file.startsWith(fileId));
    
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    
    return path.join(this.uploadFolder, file);
  }

  /**
   * Extract text from PDF
   */
  /**
   * Parse PDF file and extract data
   */
  public async parsePdf(filePath: string): Promise<PDFData> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      logger.info(`Successfully parsed PDF with ${data.numpages} pages`);
      return data;
    } catch (error) {
      logger.error(`Error parsing PDF: ${error}`);
      throw new Error(`Could not parse PDF: ${error}`);
    }
  }

  public async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      logger.info(`Extracted ${data.text.length} characters from PDF`);
      return data.text;
    } catch (error) {
      logger.error(`Error extracting text from PDF: ${error}`);
      throw new Error(`Could not extract text from PDF: ${error}`);
    }
  }

  /**
   * Convert PDF to Markdown
   */
  public async pdfToMarkdown(filePath: string): Promise<string> {
    try {
      const text = await this.extractTextFromPdf(filePath);
      
      // Clean and format text as markdown
      let markdown = '';
      
      // Split by lines
      const lines = text.split('\n');
      
      // Process lines
      let currentParagraph = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) {
          if (currentParagraph) {
            markdown += currentParagraph + '\n\n';
            currentParagraph = '';
          }
          continue;
        }
        
        // Check if it's a potential heading (short line, ends with no punctuation)
        if (trimmedLine.length < 100 && 
            !trimmedLine.endsWith('.') && 
            !trimmedLine.endsWith('!') && 
            !trimmedLine.endsWith('?') &&
            !trimmedLine.endsWith(',')) {
          
          if (currentParagraph) {
            markdown += currentParagraph + '\n\n';
            currentParagraph = '';
          }
          
          // Add as heading
          markdown += `## ${trimmedLine}\n\n`;
          continue;
        }
        
        // Add to current paragraph
        if (currentParagraph) {
          currentParagraph += ' ' + trimmedLine;
        } else {
          currentParagraph = trimmedLine;
        }
      }
      
      // Add final paragraph if exists
      if (currentParagraph) {
        markdown += currentParagraph + '\n\n';
      }
      
      logger.info(`Converted PDF to ${markdown.length} characters of markdown`);
      return markdown;
    } catch (error) {
      logger.error(`Error converting PDF to markdown: ${error}`);
      throw new Error(`Could not convert PDF to markdown: ${error}`);
    }
  }
}

// Export a singleton instance
export const pdfService = new PdfService();
