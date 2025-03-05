import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Alert, List, ListItem, ListItemText, Divider } from '@mui/material';
import { API_BASE_URL } from '../config';
import { useChat } from '../context/ChatContext';
import api from '../services/api';

/**
 * FileUpload component that handles PDF file selection and uploading
 * @component
 * @returns {JSX.Element} The file upload UI component
 */
const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState<string>('Process PDF for Chat');
  const [isDuplicate, setIsDuplicate] = useState<boolean>(false);
  const [storedPdfs, setStoredPdfs] = useState<string[]>([]);
  const [loadingStoredPdfs, setLoadingStoredPdfs] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get state setters from ChatContext
  const { setIsPdfReady, setCurrentFileId, currentFileId } = useChat();

  /**
   * Load the list of stored PDFs on component mount
   */
  useEffect(() => {
    const loadStoredPdfs = async () => {
      setLoadingStoredPdfs(true);
      try {
        const pdfs = await api.getStoredPdfs();
        setStoredPdfs(pdfs);
      } catch (error) {
        console.error('Failed to load stored PDFs:', error);
        setError('Failed to load stored PDFs');
      } finally {
        setLoadingStoredPdfs(false);
      }
    };
    
    loadStoredPdfs();
  }, []);

  /**
   * Handles file selection changes from the file input
   * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null);
        setSuccess(null);
        setIsDuplicate(false);
        setButtonText('Process PDF for Chat');
      } else {
        setSelectedFile(null);
        setError('Please select a PDF file.');
      }
    }
  };

  /**
   * Handles the file upload process
   */
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch(`${API_BASE_URL}/api/pdf/upload`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      
      setSuccess(`PDF successfully ${data.duplicate ? 'loaded from repository' : 'uploaded and processed'}.`);
      
      // Handle the successful upload
      handleSuccessfulUpload(data);
      
      // Refresh the list of stored PDFs
      const updatedPdfs = await api.getStoredPdfs();
      setStoredPdfs(updatedPdfs);
      
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setError('Failed to upload PDF. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handles successful file upload response
   * @param {any} data - The server response data
   */
  const handleSuccessfulUpload = (data: any) => {
    // Get the fileName before resetting selectedFile
    const fileName = selectedFile?.name || 'unknown';
    
    // Reset file selection
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
        fileName: fileName,
        duplicate: data.duplicate
      }
    });
    window.dispatchEvent(pdfUploadedEvent);
    
    // Update button text back to default
    setButtonText('Process PDF for Chat');
  };

  /**
   * Handles selection of a previously processed PDF
   * @param {string} pdfId - The ID of the selected PDF
   */
  const handleStoredPdfSelect = (pdfId: string) => {
    // Set the current file ID in the context
    setCurrentFileId(pdfId);
    setIsPdfReady(true);
    
    // Dispatch event to notify other components that a PDF is selected
    const pdfUploadedEvent = new CustomEvent('pdfUploaded', {
      detail: { 
        fileId: pdfId,
        fileName: pdfId,
        fromStorage: true
      }
    });
    window.dispatchEvent(pdfUploadedEvent);
    
    setSuccess('PDF loaded from repository and ready for chat.');
  };

  /**
   * Handles the upload button click
   * Triggers file selection if no file is selected, or upload if a file is selected
   */
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
        data-testid="file-input"
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
        data-testid="upload-button"
        sx={{ mb: 2 }}
      >
        {uploading ? (isDuplicate ? 'Loading from repository...' : 'Uploading...') : buttonText}
      </Button>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mt: 2, mb: 2 }} data-testid="success-message">
          {success}
        </Alert>
      )}
      
      {/* Stored PDFs Section */}
      {storedPdfs.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'left' }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Previously Processed PDFs
          </Typography>
          <List sx={{ maxHeight: '200px', overflow: 'auto' }}>
            {storedPdfs.map((pdfId) => (
              <ListItem 
                key={pdfId}
                button 
                onClick={() => handleStoredPdfSelect(pdfId)}
                selected={currentFileId === pdfId}
                sx={{ 
                  borderRadius: 1,
                  mb: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                    }
                  }
                }}
              >
                <ListItemText 
                  primary={pdfId} 
                  primaryTypographyProps={{ 
                    noWrap: true,
                    style: { 
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      
      {loadingStoredPdfs && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
};

export default FileUpload; 