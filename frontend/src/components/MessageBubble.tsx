import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

/**
 * Represents a chat message in the conversation
 * @typedef {Object} Message
 * @property {'user' | 'assistant' | 'system'} type - The sender of the message
 * @property {string} content - The content of the message
 * @property {string} timestamp - When the message was sent
 */
type Message = {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
};

/**
 * Props for the MessageBubble component
 * @interface MessageBubbleProps
 * @property {Message} message - The message object to display
 */
interface MessageBubbleProps {
  message: Message;
}

/**
 * Component that renders a single chat message bubble
 * Different styles are applied based on the message sender (user, assistant, or system)
 * 
 * @component
 * @param {MessageBubbleProps} props - The component props
 * @returns {JSX.Element} The styled message bubble
 */
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