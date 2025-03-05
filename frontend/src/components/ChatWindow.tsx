import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, TextField, Button } from '@mui/material';
import MessageBubble from './MessageBubble';
import { useChat } from '../context/ChatContext';

/**
 * ChatWindow component that displays the chat interface with messages and input field
 * @component
 * @returns {JSX.Element} The chat window UI
 */
const ChatWindow: React.FC = () => {
  // Get state and functions from ChatContext
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    currentFileId 
  } = useChat();
  
  const [inputValue, setInputValue] = useState<string>('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  /**
   * Effect hook to scroll to the bottom of the chat window when messages change
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handles form submission to send a new message
   * @param {React.FormEvent} e - The form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const message = inputValue;
    setInputValue('');
    await sendMessage(message, currentFileId);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Messages container */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.length === 0 ? (
          <WelcomeMessage hasPdf={currentFileId !== null} />
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input container */}
      <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message here..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              inputProps={{
                style: { 
                  opacity: 1,
                  color: 'inherit'
                }
              }}
            />
            <Button 
              variant="contained" 
              color="primary" 
              type="submit"
            >
              {isLoading ? <CircularProgress size={24} /> : "Send"}
            </Button>
          </Box>
        </form>
      </Box>
    </Box>
  );
};

/**
 * Displays a welcome message when no chat messages are present
 * @returns {JSX.Element} The welcome message UI
 */
const WelcomeMessage: React.FC<{ hasPdf: boolean }> = ({ hasPdf }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: '100%', 
    textAlign: 'center' 
  }}>
    <Typography variant="h5" gutterBottom>
      Welcome to PDF Chat Assistant.
    </Typography>
    {hasPdf ? (
      <>
        <Typography variant="body1" sx={{ mb: 2 }}>
          A PDF is already loaded and ready for chat!
        </Typography>
        <Typography variant="body2">
          Ask any questions about the document in the field below.
        </Typography>
      </>
    ) : (
      <>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Follow these steps to get started:
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          1. Upload a PDF document using the section above.
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          2. Wait for the processing to complete.
        </Typography>
        <Typography variant="body2">
          3. Ask questions about your document.
        </Typography>
      </>
    )}
  </Box>
);

export default ChatWindow;
