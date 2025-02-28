import React, { useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ChatMessage } from '../types/index';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  progress: number;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  isLoading,
  progress
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <Box sx={{ 
      minHeight: '300px',
      maxHeight: '500px',
      overflowY: 'auto',
      p: 2,
      bgcolor: '#f9f9f9',
      borderRadius: 1,
      mb: 2
    }}>
      {messages.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          color: 'text.secondary'
        }}>
          <Typography variant="body1">
            No messages yet. Ask a question about your PDF.
          </Typography>
        </Box>
      ) : (
        messages.map((message, index) => (
          <Box 
            key={index} 
            sx={{ 
              display: 'flex',
              flexDirection: 'column',
              mb: 2,
              maxWidth: '80%',
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              ml: message.role === 'user' ? 'auto' : 0
            }}
          >
            <Box 
              sx={{
                bgcolor: message.role === 'user' 
                  ? '#e3f2fd' 
                  : message.role === 'system' 
                    ? '#fff3e0' 
                    : '#e8f5e9',
                borderRadius: 2,
                p: 2,
                boxShadow: 1
              }}
              className={`chat-message chat-message-${message.role}`}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.secondary',
                  mb: 0.5,
                  display: 'block',
                  fontWeight: 'bold'
                }}
                className="chat-message-role"
              >
                {message.role === 'user' 
                  ? 'You' 
                  : message.role === 'system' 
                    ? 'System' 
                    : 'Assistant'}
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
                className="chat-message-content"
                data-testid="chat-message-content"
              >
                {message.content}
              </Typography>
              
              {message.sources && (
                <Box sx={{ mt: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    Sources: {message.sources.join(', ')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ))
      )}
      
      {isLoading && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 2
        }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">
            {progress > 0 
              ? `Processing... ${Math.round(progress)}%` 
              : 'Thinking...'}
          </Typography>
        </Box>
      )}
      
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default ChatWindow;
