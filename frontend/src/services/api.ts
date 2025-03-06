import { PDFList } from '../types/index';

// Backend server URL
// Use environment-aware base URL: service name in Docker, localhost in development
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8081'  // Development environment
  : 'http://backend:3000';    // Docker environment

export const convertPdfToMarkdown = async (file: File) => {
  const formData = new FormData();
  formData.append('pdf', file);
  
  const response = await fetch(`${API_BASE_URL}/pdf-to-markdown`, {
    method: 'POST',
    body: formData,
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    }
  });
  
  if (!response.ok) {
    throw new Error(`Conversion failed: ${response.statusText}`);
  }

  return response.json();
};

export const uploadPdfWithEmbeddings = async (
  file: File, 
  onProgressUpdate?: (progress: number, message: string) => void
): Promise<{ fileId: string; duplicate?: boolean }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/api/pdf/upload`, {
      method: 'POST',
      body: formData,
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload PDF: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check if this is a duplicate PDF before starting progress polling
    if (data.duplicate) {
      // For duplicate PDFs, we skip processing and return the existing fileId
      if (onProgressUpdate) {
        // Notify that the PDF was found and loaded from ChromaDB
        onProgressUpdate(100, 'PDF already exists in repository. Loaded from ChromaDB.');
      }
      
      return {
        fileId: data.fileId,
        duplicate: true
      };
    }
    
    // For new PDFs, start polling for progress if we have a fileId
    if (onProgressUpdate && data.fileId) {
      pollProgress(data.fileId, onProgressUpdate);
    }
    
    return {
      fileId: data.fileId,
      duplicate: false
    };
  } catch (error: unknown) {
    console.error('Error uploading PDF:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to upload PDF';
    throw new Error(errorMessage);
  }
};

export const pollProgress = async (
  fileId: string,
  onProgressUpdate: (progress: number, message: string) => void
) => {
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/pdf/progress/${fileId}`);
        if (!response.ok) {
          clearInterval(pollInterval);
          reject(new Error('Failed to fetch progress'));
          return;
        }
        
        const data = await response.json();
        onProgressUpdate(data.progress, data.status);
        
        if (data.progress === 100 || data.status === 'completed') {
          clearInterval(pollInterval);
          resolve(true);
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        clearInterval(pollInterval);
        reject(error);
      }
    }, 1000);
  });
};

export const getRagChatResponse = async (
  question: string,
  fileId: string
): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({
        question,
        fileId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get chat response: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.answer || 'No answer found';
  } catch (error: unknown) {
    console.error('Error getting chat response:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to get chat response';
    throw new Error(errorMessage);
  }
};

export const getRagChatStreamingResponse = async (
  question: string,
  fileId: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/rag/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({
        question,
        fileId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get streaming response: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to initialize stream reader');
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
  } catch (error: unknown) {
    console.error('Error getting streaming response:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to get streaming response';
    throw new Error(errorMessage);
  }
};

const getStoredPdfs = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/pdfs`, {
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch PDFs: ${response.statusText}`);
  }

  const data: PDFList = await response.json();
  return data.pdf_ids;
};

export const getScript = async (pdfId: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-script?pdfId=${pdfId}`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate script: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.script || '';
  } catch (error: unknown) {
    console.error('Error generating script:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to generate script';
    throw new Error(errorMessage);
  }
}

/**
 * Load a test PDF from the backend test data directory
 */
export async function loadTestPdf(
  pdfPath: string,
  onProgressUpdate?: (progress: number, message: string) => void
): Promise<{ fileId: string; progressId: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test/load-test-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({ pdfPath }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load test PDF: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Start polling for progress
    if (onProgressUpdate && data.progressId) {
      pollProgress(data.progressId, onProgressUpdate);
    }
    
    return {
      fileId: data.fileId,
      progressId: data.progressId
    };
  } catch (error: unknown) {
    console.error('Error loading test PDF:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to load test PDF';
    throw new Error(errorMessage);
  }
}

export default {
  convertPdfToMarkdown,
  uploadPdfWithEmbeddings,
  getRagChatResponse,
  getRagChatStreamingResponse,
  pollProgress,
  getStoredPdfs,
  getScript,
  loadTestPdf
};
