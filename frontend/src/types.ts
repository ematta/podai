// PDF-related types
export interface PDFData {
  fileId: string;
  markdown: string;
  script?: string;
}

export interface PDFList {
  files: string[];
  pdf_ids: string[]; // Added for backward compatibility
}

// Chat-related types
export interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
  sources?: any[]; // Added for source references
}

// Script response
export interface ScriptResponse {
  script: string;
  status: string;
}

// Progress tracking
export interface ProgressData {
  progress: number;
  message: string;
  status: 'pending' | 'completed' | 'error';
  error?: string;
}
