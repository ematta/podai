import { PDFList, ChatMessage } from '../types';

// Backend server URL with updated port
const API_URL = 'http://localhost:8081';

export const uploadPdf = async (formData: FormData) => {
  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
    mode: 'cors', // Explicitly set CORS mode
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
};

export const convertPdfToMarkdown = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/pdf-to-markdown`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Conversion failed: ${response.statusText}`);
  }

  return response.json();
};

export const getStoredPdfs = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/pdfs`);

  if (!response.ok) {
    throw new Error(`Failed to fetch PDFs: ${response.statusText}`);
  }

  const data: PDFList = await response.json();
  return data.pdf_ids;
};

export const getChatResponse = async (pdfId: string, question: string) => {
  const response = await fetch(`${API_URL}/chat/${pdfId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
    mode: 'cors', // Explicitly set CORS mode
  });

  if (!response.ok) {
    throw new Error(`Chat failed: ${response.statusText}`);
  }

  return await response.json();
};
