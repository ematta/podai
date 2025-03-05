/**
 * Represents the data structure of a PDF document in the application
 * @interface PDFData
 * @property {string} fileId - Unique identifier for the PDF file
 * @property {string} markdown - Markdown representation of the PDF content
 * @property {string} [script] - Optional script related to the PDF
 */
export interface PDFData {
  fileId: string;
  markdown: string;
  script?: string;
}

/**
 * Represents a list of PDF files available in the system
 * @interface PDFList
 * @property {string[]} [files] - Array of file identifiers 
 * @property {string[]} pdf_ids - Array of PDF identifiers (for backwards compatibility)
 */
export interface PDFList {
  files?: string[];
  pdf_ids: string[]; // Added for backward compatibility
}

/**
 * Represents a chat message in the conversation
 * @typedef ChatMessage
 * @property {'user' | 'assistant' | 'system'} type - The sender of the message
 * @property {string} content - The content of the message
 * @property {string} timestamp - ISO timestamp of when the message was sent
 */
export type ChatMessage = {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
};

/**
 * Represents the response from a script processing operation
 * @interface ScriptResponse
 * @property {string} script - The processed script content
 * @property {string} [status] - Optional status of the script processing
 * @property {string} [pdf_id] - Optional PDF identifier associated with the script
 * @property {string} [id] - Optional identifier (for backwards compatibility)
 * @property {string} [original_filename] - Optional original filename
 * @property {string} [markdown] - Optional markdown representation
 */
export interface ScriptResponse {
  script: string;
  status?: string;
  pdf_id?: string;
  id?: string;       // Added for backward compatibility
  original_filename?: string;
  markdown?: string;
}

/**
 * Represents the progress data during file processing operations
 * @interface ProgressData
 * @property {number} progress - The progress percentage (0-100)
 * @property {string} message - Message describing the current progress state
 * @property {'pending' | 'completed' | 'error'} status - Status of the operation
 * @property {string} [error] - Optional error message if status is 'error'
 */
export interface ProgressData {
  progress: number;
  message: string;
  status: 'pending' | 'completed' | 'error';
  error?: string;
}
