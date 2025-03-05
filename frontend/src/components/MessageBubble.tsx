import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

type Message = {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
};

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '70%',
          backgroundColor: isSystem 
            ? '#fff3e0' 
            : isUser 
              ? '#e3f2fd' 
              : '#f1f8e9',
          borderRadius: 2,
        }}
      >
        <Typography variant="body1">{message.content}</Typography>
      </Paper>
    </Box>
  );
};

export default MessageBubble; 