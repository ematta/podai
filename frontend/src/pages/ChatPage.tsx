import { Box, Button, Container, Typography, Paper, Input } from '@mui/material';
import { useState } from 'react';
import PdfUploader from '../components/PdfUploader';
import ChatWindow from '../components/ChatWindow';
import ProgressBar from '../components/ProgressBar';
import TestUtils from '../components/TestUtils';
import * as api from '../services/api';

const PodcastGenerator = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    setSelectedFile(file);
    setPdfId(null);
    setFileId(null);
    setError(null);
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
            messages={[]} 
            isLoading={isLoading} 
            progress={progress}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }} data-testid="chat-input-container">
            <Input 
              fullWidth
              type="text"
              placeholder="Ask a question about the document..."
              disabled={isLoading}
              data-testid="chat-input"
            />
            <Button 
              variant="contained" 
              color="primary"
              disabled={isLoading}
              data-testid="chat-send-button"
            >
              {isLoading ? 'Loading...' : 'Send'}
            </Button>
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default PodcastGenerator;
