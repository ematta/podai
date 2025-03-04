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

export async function uploadPdfWithEmbeddings(
  file: File, 
  onProgressUpdate?: (progress: number, message: string) => void
): Promise<{ fileId: string; progressId: string }> {
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await fetch(`${API_BASE_URL}/api/store-pdf`, {
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
    
    // Start polling for progress
    if (onProgressUpdate && data.progressId) {
      pollProgress(data.progressId, onProgressUpdate);
    }
    
    return {
      fileId: data.fileId,
      progressId: data.progressId
    };
  } catch (error: unknown) {
    console.error('Error uploading PDF:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to upload PDF';
    throw new Error(errorMessage);
  }
}

export const getRagChatResponse = async (
  question: string,
  fileId: string
): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat-rag`, {
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
}

export const getRagChatStreamingResponse = async (
  question: string,
  fileId: string,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat-rag-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    
    if (!response.body) {
      throw new Error('Response body is null');
    }
    
    // Get a reader from the response body stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // Process the stream chunks
    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          // If the stream is done, call the onComplete callback
          if (done) {
            onComplete();
            break;
          }
          
          // Decode the chunk and send it to the callback
          const chunk = decoder.decode(value);
          onChunk(chunk);
        }
      } catch (error: unknown) {
        console.error('Error processing stream:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to process stream';
        onError(new Error(errorMessage));
      }
    };
    
    // Start processing the stream
    processStream();
    
  } catch (error: unknown) {
    console.error('Error getting streaming chat response:', error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to get streaming chat response';
    onError(new Error(errorMessage));
  }
};

export async function pollProgress(
  progressId: string, 
  onProgressUpdate?: (progress: number, message: string) => void
): Promise<boolean> {
  let retries = 0;
  const maxRetries = 100; // More retries for longer processing
  const initialDelay = 1000; // Initial delay of 1 second
  const maxDelay = 5000; // Maximum delay of 5 seconds
  
  return new Promise((resolve, reject) => {
    const poll = async (): Promise<boolean> => {
      // Check if we've exceeded the timeout
      if (retries >= maxRetries) {
        console.warn('Max polling retries reached');
        resolve(true); // Resolve anyway to prevent hanging
        return true;
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/progress/${progressId}`, {
          mode: 'cors',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('Progress not found, proceeding anyway');
            resolve(true);
            return true;
          }
          throw new Error(`Failed to get progress: ${response.statusText}`);
        }
        
        const progressData = await response.json();
        
        console.log('Progress update:', progressData);
        
        if (onProgressUpdate) {
          onProgressUpdate(progressData.progress, progressData.message);
        }
        
        if (progressData.status === 'completed' || progressData.progress === 100) {
          console.log('Process completed successfully! Ready for chat.');
          resolve(true);
          return true;
        }
        
        if (progressData.status === 'error') {
          console.error('Process failed:', progressData.message);
          reject(new Error(progressData.message || 'Process failed'));
          return false;
        }
        
        retries++;
        // Exponential backoff with jitter and max delay
        const exponentialDelay = Math.min(
          initialDelay * Math.pow(1.5, retries) + Math.random() * 500,
          maxDelay
        );
        setTimeout(() => poll(), exponentialDelay);
        return false;
      } catch (error: unknown) {
        console.error('Error polling progress:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Failed to poll progress';
        
        // For network errors, retry with exponential backoff
        if (retries < maxRetries) {
          retries++;
          const exponentialDelay = Math.min(
            initialDelay * Math.pow(1.5, retries) + Math.random() * 500,
            maxDelay
          );
          setTimeout(() => poll(), exponentialDelay);
          return false;
        }
        
        reject(new Error(errorMessage));
        return false;
      }
    };
    
    // Start polling with initial delay
    setTimeout(() => poll(), initialDelay);
  });
}

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
