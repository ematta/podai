import React, { useState, useEffect } from "react";
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import AppButton from "../components/Button";
import { parsePdf } from "../client/parsePdf";
import { createScript } from "../client/createScript";
import { processPodcast, downloadPodcastFile } from "../client/processPodcast";
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import DownloadIcon from '@mui/icons-material/Download';

export default function Home() {
    const [markdownContent, setMarkdownContent] = useState('');
    const [scriptContent, setScriptContent] = useState('');
    const [podcastResult, setPodcastResult] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [fileName, setFileName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isProcessingPodcast, setIsProcessingPodcast] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // Default to 'success'
    
    // Mock mode state
    const [mockMode, setMockMode] = useState(false);
    const [mockStatus, setMockStatus] = useState(null);
    const [loadingMockStatus, setLoadingMockStatus] = useState(false);

    // Fetch mock status on component mount
    useEffect(() => {
        fetchMockStatus();
    }, []);

    const fetchMockStatus = async () => {
        setLoadingMockStatus(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/podcast/mock-status`);
            if (response.ok) {
                const status = await response.json();
                setMockStatus(status);
                setMockMode(status.mock_enabled);
            }
        } catch (error) {
            console.error('Error fetching mock status:', error);
        } finally {
            setLoadingMockStatus(false);
        }
    };

    const toggleMockMode = async (enabled) => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/podcast/mock-toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    enabled: enabled,
                    delay_seconds: 2.0 
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setMockMode(enabled);
                setSnackbarMessage(result.message);
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
                // Refresh status
                await fetchMockStatus();
            } else {
                throw new Error('Failed to toggle mock mode');
            }
        } catch (error) {
            console.error('Error toggling mock mode:', error);
            setSnackbarMessage('Error: Failed to toggle mock mode');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

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

    const handleGenerateScript = async () => {
        if (!markdownContent) {
            setSnackbarMessage('Please upload and parse a PDF first.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        setIsGeneratingScript(true);
        try {
            const response = await createScript(markdownContent);
            console.log('Script generation successful:', response);
            
            if (response.error) {
                setSnackbarMessage(response.error);
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            } else if (response.content_markdown) {
                setScriptContent(response.content_markdown);
                setSnackbarMessage('Script generated successfully!');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            }
        } catch (error) {
            console.error('Script generation failed:', error);
            setSnackbarMessage('Error: Failed to generate script. Please try again.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const handleDownloadPodcast = async (filename) => {
        try {
            await downloadPodcastFile(filename);
            setSnackbarMessage('Download started successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (error) {
            console.error('Download failed:', error);
            setSnackbarMessage('Error: Failed to download file. Please try again.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleProcessPodcast = async () => {
        if (!scriptContent) {
            setSnackbarMessage('Please generate a script first.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        setIsProcessingPodcast(true);
        try {
            const response = await processPodcast(scriptContent);
            console.log('Podcast processing successful:', response);
            
            if (response.error) {
                setSnackbarMessage(response.error);
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
            } else {
                setPodcastResult(response);
                setSnackbarMessage('Podcast processed successfully!');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            }
        } catch (error) {
            console.error('Podcast processing failed:', error);
            setSnackbarMessage('Error: Failed to process podcast. Please try again.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsProcessingPodcast(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Typography variant="h1" component="h1" gutterBottom>
                PodAI
            </Typography>
            
            {/* Mock Mode Toggle Section */}
            <Paper elevation={2} sx={{ p: 2, mb: 3, backgroundColor: '#f8f9fa' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6">
                            Development Mode
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={mockMode}
                                    onChange={(e) => toggleMockMode(e.target.checked)}
                                    color="primary"
                                    disabled={loadingMockStatus}
                                />
                            }
                            label={mockMode ? "Mock Mode" : "Real API"}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                            label={mockMode ? "🎭 MOCK" : "🚀 REAL"} 
                            color={mockMode ? "warning" : "success"}
                            variant="filled"
                        />
                        {mockStatus && (
                            <Chip 
                                label={mockStatus.segmind_api_available ? "API Key ✓" : "API Key ✗"} 
                                color={mockStatus.segmind_api_available ? "success" : "error"}
                                variant="outlined"
                                size="small"
                            />
                        )}
                    </Box>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {mockMode ? 
                        "⚡ Mock mode creates fake audio files instantly for testing without API costs" : 
                        "💸 Real mode uses Segmind API - costs money per request"
                    }
                </Typography>
            </Paper>

            <Box sx={{ mb: 3 }}>
                <AppButton 
                    sx={{ color: 'gray', mr: 2 }} 
                    children={isLoading ? "Parsing..." : "Parse PDF"} 
                    onClick={handleUpload}
                    disabled={isLoading}
                />
                
                {markdownContent && (
                    <AppButton 
                        sx={{ color: 'blue', mr: 2 }} 
                        children={isGeneratingScript ? "Generating Script..." : "Generate Script"} 
                        onClick={handleGenerateScript}
                        disabled={isGeneratingScript || isLoading}
                    />
                )}

                {scriptContent && (
                    <AppButton 
                        sx={{ color: 'green' }} 
                        children={isProcessingPodcast ? "Processing Podcast..." : "Process Podcast"} 
                        onClick={handleProcessPodcast}
                        disabled={isProcessingPodcast || isGeneratingScript || isLoading}
                    />
                )}
            </Box>

            {(isLoading || isGeneratingScript || isProcessingPodcast) && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <Typography variant="body1" sx={{ mr: 2 }}>
                        {isLoading && "Parsing PDF..."}
                        {isGeneratingScript && "Generating Script..."}
                        {isProcessingPodcast && (mockMode ? "🎭 Creating Mock Audio..." : "🚀 Processing with Segmind API...")}
                    </Typography>
                    <CircularProgress size={24} />
                </Box>
            )}

            {markdownContent && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Parsed PDF Content:
                    </Typography>
                    <TextField
                        multiline
                        fullWidth
                        rows={10}
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

            {scriptContent && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Generated Podcast Script:
                    </Typography>
                    <TextField
                        multiline
                        fullWidth
                        rows={15}
                        value={scriptContent}
                        variant="outlined"
                        InputProps={{
                            readOnly: true,
                            sx: {
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                backgroundColor: '#f0f8ff'
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

            {podcastResult && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Podcast Processing Result:
                        {podcastResult.mock_mode && (
                            <Chip 
                                label="🎭 MOCK" 
                                color="warning" 
                                size="small" 
                                sx={{ ml: 1 }}
                            />
                        )}
                    </Typography>
                    {podcastResult.audio_url ? (
                        <Box>
                            <audio controls style={{ width: '100%', marginBottom: '16px' }}>
                                <source src={podcastResult.audio_url} type="audio/mpeg" />
                                Your browser does not support the audio element.
                            </audio>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                Audio URL: {podcastResult.audio_url}
                            </Typography>
                        </Box>
                    ) : podcastResult.success && podcastResult.filename ? (
                        <Box>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                Podcast generated successfully! File: {podcastResult.filename}
                                {podcastResult.mock_mode && (
                                    <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1 }}>
                                        🎭 This is a mock audio file (3 seconds of silence) created for testing
                                    </Typography>
                                )}
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={() => handleDownloadPodcast(podcastResult.filename)}
                                sx={{ mb: 2 }}
                            >
                                Download Audio File
                            </Button>
                            {podcastResult.downloadUrl && (
                                <Box>
                                    <audio controls style={{ width: '100%', marginBottom: '16px' }}>
                                        <source src={podcastResult.downloadUrl} type="audio/wav" />
                                        Your browser does not support the audio element.
                                    </audio>
                                </Box>
                            )}
                        </Box>
                    ) : (
                        <TextField
                            multiline
                            fullWidth
                            rows={8}
                            value={JSON.stringify(podcastResult, null, 2)}
                            variant="outlined"
                            InputProps={{
                                readOnly: true,
                                sx: {
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem',
                                    backgroundColor: '#f0fff0'
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
                    )}
                </Box>
            )}

            <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>
                Workflow: PDF → Markdown → Script → Podcast
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Upload a PDF, generate a podcast script, and then process it into audio.
            </Typography>

            <Paper elevation={3} sx={{ p: 2, borderRadius: '8px', mb: 4 }}>
                <Typography variant="subtitle1" gutterBottom>
                    Mock Mode
                </Typography>
                <FormControlLabel
                    control={
                        <Switch
                            checked={mockMode}
                            onChange={(e) => toggleMockMode(e.target.checked)}
                            color="primary"
                            disabled={loadingMockStatus}
                        />
                    }
                    label={loadingMockStatus ? "Loading..." : (mockMode ? "Enabled" : "Disabled")}
                />
                {mockStatus && (
                    <Chip
                        label={`Mock API: ${mockStatus.mock_enabled ? "Enabled" : "Disabled"}`}
                        color={mockStatus.mock_enabled ? "success" : "error"}
                        variant="outlined"
                        sx={{ mt: 1 }}
                    />
                )}
            </Paper>

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