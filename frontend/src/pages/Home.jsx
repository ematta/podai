import React, { useState } from "react";
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import AppButton from "../components/Button";
import { parsePdf } from "../client/parsePdf";
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

export default function Home() {
    const [markdownContent, setMarkdownContent] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [fileName, setFileName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // Default to 'success'

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleUpload = async () => {
        // Create an input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';

        // Listen for file selection
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                setIsLoading(true);
                setFileName(file.name);
                try {
                    const response = await parsePdf(file);
                    console.log('Upload successful:', response);
                    
                    if (response.error) {
                        setSnackbarMessage(response.error);
                        setSnackbarSeverity('error');
                        setSnackbarOpen(true);
                    } else if (response.content_markdown) {
                        setMarkdownContent(response.content_markdown);
                        setSnackbarMessage('PDF parsed successfully!');
                        setSnackbarSeverity('success');
                        setSnackbarOpen(true);
                    }
                } catch (error) {
                    console.error('Upload failed:', error);
                    setSnackbarMessage('Error: Failed to parse PDF. Please try again.');
                    setSnackbarSeverity('error');
                    setSnackbarOpen(true);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        // Trigger the file input click
        input.click();
    };

    return (
        <Container maxWidth="md">
            <Typography variant="h1" component="h1" gutterBottom>
                PodAI
            </Typography>
            
            <Box sx={{ mb: 3 }}>
                <AppButton 
                    sx={{ color: 'gray' }} 
                    children={isLoading ? "Parsing..." : "Parse PDF"} 
                    onClick={handleUpload}
                    disabled={isLoading}
                />
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <Typography variant="body1" sx={{ mr: 2 }}>
                        Parsing PDF...
                    </Typography>
                    <span className="MuiCircularProgress-root MuiCircularProgress-indeterminate" role="progressbar" style={{ width: 24, height: 24 }}>
                        <svg viewBox="22 22 44 44" style={{ width: 24, height: 24 }}>
                            <circle
                                cx="44"
                                cy="44"
                                r="20.2"
                                fill="none"
                                strokeWidth="3.6"
                                stroke="#1976d2"
                                strokeDasharray="80,200"
                                strokeDashoffset="0"
                                strokeLinecap="round"
                            />
                        </svg>
                    </span>
                </Box>
            )}

            {markdownContent && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Please review the content to move further:
                    </Typography>
                    <TextField
                        multiline
                        fullWidth
                        rows={20}
                        value={markdownContent}
                        variant="outlined"
                        InputProps={{
                            readOnly: true,
                            sx: {
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                backgroundColor: '#f5f5f5'
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': {
                                    borderColor: '#e0e0e0',
                                },
                                '&:hover fieldset': {
                                    borderColor: '#bdbdbd',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#1976d2',
                                },
                            },
                        }}
                    />
                </Box>
            )}

            <Typography variant="h6" sx={{ mt: 2 }} gutterBottom>
                Now, we will look at converting this into a podcast script.
            </Typography>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}