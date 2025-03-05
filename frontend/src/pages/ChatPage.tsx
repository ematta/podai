import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper, 
  Container,
  CircularProgress
} from '@mui/material';
import { ChatMessage } from '../types';
import { API_BASE_URL } from '../config';

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileId, setFileId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for PDF uploaded events
  useEffect(() => {
    const handlePdfUpload = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.fileId) {
        setFileId(customEvent.detail.fileId);
        
        // Add system message
        const systemMessage: ChatMessage = {
          type: 'system',
          content: 'PDF has been uploaded and processed. You can now ask questions about it.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    };

    window.addEventListener('pdfUploaded', handlePdfUpload);
    return () => {
      window.removeEventListener('pdfUploaded', handlePdfUpload);
    };
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Use RAG endpoint if fileId is available
      if (fileId) {
        const response = await fetch(`${API_BASE_URL}/api/chat/rag/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: input,
            fileId: fileId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from the server');
        }

        // Create placeholder for assistant message
        const assistantMessage: ChatMessage = {
          type: 'assistant',
          content: '',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let done = false;
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          
          if (done) break;
          
          const text = decoder.decode(value);
          
          // Update assistant message with streamed content
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].type === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content + text,
              };
            }
            return updated;
          });
        }
      } else {
        // Regular chat endpoint for non-PDF related questions
        const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: input }),
        });

        const data = await response.json();

        if (response.ok) {
          const assistantMessage: ChatMessage = {
            type: 'assistant',
            content: data.response,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error(data.message || 'Failed to get response');
        }
      }
    } catch (error) {
      console.error('Error in chat:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        type: 'system',
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          height: 'calc(100vh - 150px)', 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Messages area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%' 
            }}>
              <Typography variant="h6" gutterBottom>
                Welcome to PDF Chat Assistant
              </Typography>
              <Typography variant="body1">
                Upload a PDF document to get started
              </Typography>
            </Box>
          ) : (
            messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2,
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    backgroundColor: 
                      msg.type === 'system' 
                        ? '#fff3e0' 
                        : msg.type === 'user' 
                          ? '#e3f2fd' 
                          : '#f1f8e9',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1">{msg.content}</Typography>
                </Paper>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>
        
        {/* Input area */}
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <form onSubmit={handleSendMessage}>
            <Box sx={{ display: 'flex' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type your message here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                sx={{ mr: 1 }}
                // Always enabled
                disabled={false}
              />
              <Button 
                variant="contained" 
                color="primary" 
                type="submit"
                disabled={false}
                sx={{ minWidth: '100px' }}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Send'}
              </Button>
            </Box>
          </form>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChatPage;
