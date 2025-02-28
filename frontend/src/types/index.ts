// PDF-related types
export interface PDFData {
  fileId: string;
  markdown: string;
  script?: string;
}

export interface PDFList {
  files?: string[];
  pdf_ids: string[]; // Added for backward compatibility
}

// Chat-related types
export interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
  sources?: string[]; // References to document sources (e.g., page numbers, sections)
}

// Script response
export interface ScriptResponse {
  script: string;
  status?: string;
  pdf_id?: string;
  id?: string;       // Added for backward compatibility
  original_filename?: string;
  markdown?: string;
}

// Progress tracking
export interface ProgressData {
  progress: number;
  message: string;
  status: 'pending' | 'completed' | 'error';
  error?: string;
}
