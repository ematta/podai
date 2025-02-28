import { useState, useRef, KeyboardEvent } from 'react';
import { Box, Button, Container, Typography, Paper, Input } from '@mui/material';
import PdfUploader from '../components/PdfUploader';
import ChatWindow from '../components/ChatWindow';
import ProgressBar from '../components/ProgressBar';
import TestUtils from '../components/TestUtils';
import * as api from '../services/api';
import { ChatMessage } from '../types';

const ChatPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    setSelectedFile(file);
    setPdfId(null);
    setFileId(null);
    setError(null);
    setChatMessages([]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file first');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setChatMessages([]);
      
      const { fileId } = await api.uploadPdfWithEmbeddings(selectedFile, (progress, message) => {
        setProgress(progress);
        setProgressMessage(message);
      });
      
      setFileId(fileId);
      
    } catch (err: any) {
      console.error('Error uploading PDF:', err);
      setError(err.message || 'Failed to upload PDF');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTestPdfSelect = async (pdfPath: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setProgressMessage('Processing test PDF...');
      setChatMessages([]);
      
      const { fileId } = await api.loadTestPdf(pdfPath, (progress, message) => {
        setProgress(progress);
        setProgressMessage(message);
      });
      
      setFileId(fileId);
      
    } catch (err: any) {
      console.error('Error loading test PDF:', err);
      setError(err.message || 'Failed to load test PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !fileId || isChatLoading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    setChatInput('');
    
    try {
      // Add a placeholder message for the assistant that will be updated
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '...'
      }]);
      
      const response = await api.getRagChatResponse(chatInput, fileId);
      
      // Replace the placeholder with the actual response
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: response
        };
        return newMessages;
      });
      
    } catch (err: any) {
      console.error('Error getting chat response:', err);
      setChatMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${err.message || 'Failed to get a response'}`
      }]);
    } finally {
      setIsChatLoading(false);
      
      // Focus the chat input after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleInputKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom data-testid="page-title">
        PDF Chat Assistant
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }} data-testid="upload-section">
        <Typography variant="h6" gutterBottom data-testid="upload-title">
          Upload a PDF file
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <PdfUploader
            selectedFile={selectedFile}
            isLoading={isLoading}
            onFileChange={handleFileChange}
            onUpload={handleUpload}
          />
          
          {/* Test utilities for easy testing */}
          <TestUtils onTestPdfSelect={handleTestPdfSelect} />
        </Box>
        
        {isLoading && (
          <Paper elevation={2} sx={{ mt: 2, p: 2 }} data-testid="processing-panel">
            <Typography variant="h6" sx={{ mb: 1 }} data-testid="processing-title">Processing PDF</Typography>
            <ProgressBar progress={progress} label={progressMessage || 'Processing...'} />
          </Paper>
        )}
        
        {(pdfId || fileId) && !isLoading && (
          <Paper elevation={2} sx={{ mt: 2, p: 2, bgcolor: '#e8f5e9' }} data-testid="success-panel">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  color: 'success.main', 
                  mr: 1,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.5rem'
                }}
              >
                ✅
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.dark' }} data-testid="success-message">
                PDF is processed and ready for chat!
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-testid="success-details">
              You can now ask questions about this document using the chat interface below.
            </Typography>
          </Paper>
        )}
        
        {error && (
          <Box sx={{ mt: 2, color: 'error.main' }} data-testid="error-message">
            <Typography variant="body1">{error}</Typography>
          </Box>
        )}
      </Paper>
      
      {(pdfId || fileId) && (
        <Paper elevation={3} sx={{ p: 3 }} data-testid="chat-section">
          <Typography variant="h6" gutterBottom data-testid="chat-title">
            Chat with your PDF
          </Typography>
          
          <ChatWindow 
            messages={chatMessages} 
            isLoading={isChatLoading} 
            progress={progress}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }} data-testid="chat-input-container">
            <Input 
              fullWidth
              type="text"
              placeholder="Ask a question about the document..."
              disabled={isLoading || isChatLoading}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleInputKeyPress}
              inputRef={inputRef}
              data-testid="chat-input"
            />
            <Button 
              variant="contained" 
              color="primary"
              disabled={isLoading || isChatLoading || !chatInput.trim()}
              onClick={handleChatSubmit}
              data-testid="chat-send-button"
            >
              {isChatLoading ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default ChatPage;
