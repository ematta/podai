import React, { useState, useRef } from 'react';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { API_BASE_URL } from '../config';
import { useChat } from '../context/ChatContext';

const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState<string>('Process PDF for Chat');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get state setters from ChatContext
  const { setIsPdfReady, setCurrentFileId } = useChat();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null);
        setSuccess(null);
        setButtonText('Process PDF for Chat');
      } else {
        setSelectedFile(null);
        setError('Please select a PDF file.');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/pdf`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Check if this was a duplicate PDF
        if (data.duplicate) {
          setSuccess(`This PDF has already been processed. Using existing file: ${data.fileId}`);
        } else {
          setSuccess(`File uploaded successfully. File ID: ${data.fileId}`);
        }
        
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Update app state via context
        setCurrentFileId(data.fileId);
        setIsPdfReady(true);
        
        // Dispatch the pdfUploaded event with the fileId for other components
        const pdfUploadedEvent = new CustomEvent('pdfUploaded', {
          detail: { 
            fileId: data.fileId,
            fileName: selectedFile.name,
            duplicate: data.duplicate
          }
        });
        window.dispatchEvent(pdfUploadedEvent);
        
        // Update button text back to default
        setButtonText('Process PDF for Chat');
      } else {
        setError(data.message || 'Failed to upload file.');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('An error occurred while uploading the file.');
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    if (selectedFile) {
      handleUpload();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <Box sx={{ 
      p: 3, 
      border: '1px dashed #ccc', 
      borderRadius: 1, 
      textAlign: 'center',
      backgroundColor: 'background.paper'
    }}>
      <input
        type="file"
        hidden
        accept="application/pdf"
        onChange={handleFileChange}
        ref={fileInputRef}
      />
      
      <Typography variant="h6" gutterBottom>
        Upload a PDF Document
      </Typography>
      
      {selectedFile && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Selected file: {selectedFile.name}
        </Typography>
      )}
      
      <Button
        variant="contained"
        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
        onClick={handleButtonClick}
      >
        {uploading ? 'Uploading...' : buttonText}
      </Button>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload; 