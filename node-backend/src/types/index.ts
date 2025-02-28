export interface UploadResponse {
  fileId: string;
  markdown: string;
  script: string;
}

export interface ChatRequest {
  question: string;
}

export interface ChatResponse {
  answer: string;
}

export interface ErrorResponse {
  error: string;
  [key: string]: any;
}
