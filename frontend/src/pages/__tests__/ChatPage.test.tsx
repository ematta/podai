import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPage from '../ChatPage';
import * as api from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  uploadPdfWithEmbeddings: vi.fn(),
  loadTestPdf: vi.fn(),
  getRagChatResponse: vi.fn(),
}));

// Mock scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('ChatPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  it('renders the upload section initially', () => {
    render(<ChatPage />);
    
    expect(screen.getByText('PDF Chat Assistant')).toBeInTheDocument();
    // Look for the upload section content
    expect(screen.getByText(/Upload PDF for Podcast Script/)).toBeInTheDocument();
    expect(screen.queryByTestId('chat-section')).not.toBeInTheDocument();
  });
  
  it('displays error when API call fails', async () => {
    // Mock the console.error to prevent error output in test results
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    try {
      // Mock a rejected API call to trigger error display
      vi.mocked(api.loadTestPdf).mockRejectedValueOnce(new Error('Test error'));
      
      render(<ChatPage />);
      
      // Click on the test PDF button to trigger the API call
      const testPdfButton = screen.getByTestId('test-pdf-0');
      await userEvent.click(testPdfButton);
      
      // Wait for the error message to appear
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    } finally {
      // Restore console.error
      console.error = originalConsoleError;
    }
  });
  
  it('calls uploadPdfWithEmbeddings when a file is uploaded', async () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockResponse = { fileId: 'test123', progressId: 'progress123' };
    
    // Mock the API response
    vi.mocked(api.uploadPdfWithEmbeddings).mockResolvedValue(mockResponse);
    
    render(<ChatPage />);
    
    // Set the file
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    
    // Click convert button
    const uploadButton = screen.getByText('Convert to Podcast Script');
    await userEvent.click(uploadButton);
    
    // Check that the API was called
    expect(api.uploadPdfWithEmbeddings).toHaveBeenCalledWith(
      mockFile,
      expect.any(Function)
    );
    
    // Wait for API call to resolve
    await waitFor(() => {
      expect(api.uploadPdfWithEmbeddings).toHaveBeenCalled();
    });
  });
  
  it('calls loadTestPdf when a test PDF is selected', async () => {
    const mockResponse = { fileId: 'test123', progressId: 'progress123' };
    
    // Mock the API response
    vi.mocked(api.loadTestPdf).mockResolvedValue(mockResponse);
    
    render(<ChatPage />);
    
    // Find the test PDF button and click it
    const testPdfButton = screen.getByTestId('test-pdf-0');
    await userEvent.click(testPdfButton);
    
    // Check that the API was called
    expect(api.loadTestPdf).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function)
    );
    
    // Since the API call is mocked, we just need to wait for the promise to resolve
    await waitFor(() => {
      expect(api.loadTestPdf).toHaveBeenCalled();
    });
  });
  
  it('sends chat messages and displays responses', async () => {
    const mockResponse = 'This is a test response from the API';
    const mockFileId = 'test123';
    
    // Mock the API response for loadTestPdf
    vi.mocked(api.loadTestPdf).mockResolvedValue({ 
      fileId: mockFileId, 
      progressId: 'progress123' 
    });
    
    // Mock chat response
    vi.mocked(api.getRagChatResponse).mockResolvedValue(mockResponse);
    
    render(<ChatPage />);
    
    // Simulate that a PDF has been loaded
    await userEvent.click(screen.getByTestId('test-pdf-0'));
    
    // Wait for loadTestPdf call to resolve
    await waitFor(() => {
      expect(api.loadTestPdf).toHaveBeenCalled();
    });
    
    // Mock successful file load to show chat input
    document.dispatchEvent(new Event('fileLoaded'));
    
    // Wait for chat input to be visible
    await waitFor(() => {
      const chatInput = screen.getByPlaceholderText(/ask a question/i);
      expect(chatInput).toBeInTheDocument();
      
      // Type a question in the chat input
      fireEvent.change(chatInput, { target: { value: 'What is the main topic?' } });
    });
    
    // Find the send button
    const sendButton = screen.getByTestId('chat-send-button');
    expect(sendButton).toBeInTheDocument();
    
    // Click send
    await userEvent.click(sendButton);
    
    // Check that the API was called
    await waitFor(() => {
      expect(api.getRagChatResponse).toHaveBeenCalledWith(
        'What is the main topic?',
        mockFileId
      );
    });
  });
});
