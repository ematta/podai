import { PDFList } from '../types';

// Backend server URL with updated port
const API_URL = 'http://localhost:8081';
const API_BASE_URL = API_URL;

const uploadPdf = async (formData: FormData, onProgress?: (progress: number) => void) => {
  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
    mode: 'cors', // Explicitly set CORS mode
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  // If we get an operation ID, it means we need to poll for results
  if (data.operationId) {
    return pollForResults(data.operationId, onProgress);
  }
  
  return data;
};

const convertPdfToMarkdown = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/pdf-to-markdown`, {
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
  } catch (error: any) {
    console.error('Error uploading PDF:', error);
    throw new Error(error.message || 'Failed to upload PDF');
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
  } catch (error: any) {
    console.error('Error getting chat response:', error);
    throw new Error(error.message || 'Failed to get chat response');
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
      } catch (error: any) {
        console.error('Error processing stream:', error);
        onError(new Error(`Failed to process stream: ${error.message}`));
      }
    };
    
    // Start processing the stream
    processStream();
    
  } catch (error: any) {
    console.error('Error getting streaming chat response:', error);
    onError(new Error(error.message || 'Failed to get streaming chat response'));
  }
};

export async function pollProgress(
  progressId: string, 
  onProgressUpdate?: (progress: number, message: string) => void
): Promise<boolean> {
  let retries = 0;
  const maxRetries = 100; // More retries for longer processing
  
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/api/progress/${progressId}`, {
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
            return;
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
          return;
        }
        
        if (progressData.status === 'error') {
          console.error('Process failed:', progressData.message);
          reject(new Error(progressData.message || 'Process failed'));
          return;
        }
        
        retries++;
        if (retries >= maxRetries) {
          console.warn('Max polling retries reached');
          resolve(true); // Resolve anyway to prevent hanging
          return;
        }
        
        // Adaptive polling - slower as time progresses
        const delay = Math.min(1000 + (retries * 100), 3000);
        setTimeout(poll, delay);
      } catch (error) {
        console.error('Error polling progress:', error);
        retries++;
        
        if (retries >= maxRetries) {
          console.warn('Max polling retries reached after error');
          resolve(true); // Resolve anyway to prevent hanging
          return;
        }
        
        setTimeout(poll, 2000);
      }
    };
    
    // Start polling
    poll();
  });
}

const getChatResponse = async (pdfId: string, question: string, onProgress?: (progress: number) => void) => {
  const response = await fetch(`${API_URL}/chat/${pdfId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    mode: 'cors',
    credentials: 'include',
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(`Chat failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  // If we get an operation ID, it means we need to poll for results
  if (data.operationId) {
    return pollForResults(data.operationId, onProgress);
  }
  
  return data;
};

const checkProgress = async (operationId: string) => {
  const response = await fetch(`${API_URL}/progress/${operationId}`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to check progress: ${response.statusText}`);
  }

  return response.json();
};

const pollForResults = async (operationId: string, 
  onProgress?: (progress: number) => void, 
  interval: number = 1000, 
  timeout: number = 300000) => {
  
  const startTime = Date.now();
  
  // Create a function that polls until completion or timeout
  const poll = async (): Promise<any> => {
    // Check if we've exceeded the timeout
    if (Date.now() - startTime > timeout) {
      throw new Error('Operation timed out');
    }
    
    const progressData = await checkProgress(operationId);
    
    // Report progress if callback provided
    if (onProgress && typeof progressData.progress === 'number') {
      onProgress(progressData.progress);
    }
    
    // If complete, return the result
    if (progressData.status === 'complete' && progressData.result) {
      return progressData.result;
    }
    
    // If error, throw the error
    if (progressData.status === 'error') {
      throw new Error(progressData.result?.error || 'Operation failed');
    }
    
    // Otherwise wait and try again
    await new Promise(resolve => setTimeout(resolve, interval));
    return poll();
  };
  
  return poll();
};

const getStoredPdfs = async (): Promise<string[]> => {
  const response = await fetch(`${API_URL}/pdfs`, {
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
  } catch (error: any) {
    console.error('Error generating script:', error);
    throw new Error(error.message || 'Failed to generate script');
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
  } catch (error: any) {
    console.error('Error loading test PDF:', error);
    throw new Error(error.message || 'Failed to load test PDF');
  }
}

export default {
  uploadPdf,
  convertPdfToMarkdown,
  uploadPdfWithEmbeddings,
  getRagChatResponse,
  getRagChatStreamingResponse,
  pollProgress,
  getStoredPdfs,
  getScript,
  loadTestPdf
};
