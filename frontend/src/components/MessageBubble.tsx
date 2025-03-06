import React, { useState } from 'react';
import { Box, Paper, Typography, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
  const [expandedThinking, setExpandedThinking] = useState(false);

  // Process message content to separate thinking sections
  const processMessageContent = () => {
    const content = message.content;
    
    // Check if the message has a <think> section
    if (message.type === 'assistant' && content.includes('<think>') && content.includes('</think>')) {
      // Extract the thinking part and the rest of the message
      const thinkStartIndex = content.indexOf('<think>');
      const thinkEndIndex = content.indexOf('</think>') + '</think>'.length;
      
      const thinkingContent = content.substring(
        thinkStartIndex + '<think>'.length, 
        thinkEndIndex - '</think>'.length
      );
      
      // Get the content before and after the thinking section
      const beforeThinking = content.substring(0, thinkStartIndex);
      const afterThinking = content.substring(thinkEndIndex);
      
      return {
        hasThinking: true,
        beforeThinking,
        thinkingContent,
        afterThinking
      };
    }
    
    return {
      hasThinking: false,
      content
    };
  };

  const contentParts = processMessageContent();

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
        {contentParts.hasThinking ? (
          <>
            {contentParts.beforeThinking && (
              <Typography variant="body1">{contentParts.beforeThinking}</Typography>
            )}
            
            <Box sx={{ mt: 1, mb: 1, borderLeft: '3px solid #ccc', pl: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Thinking
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setExpandedThinking(!expandedThinking)}
                  sx={{ ml: 1 }}
                >
                  {expandedThinking ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>
              
              <Collapse in={expandedThinking}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    color: 'text.secondary',
                    fontSize: '0.9rem'
                  }}
                >
                  {contentParts.thinkingContent}
                </Typography>
              </Collapse>
            </Box>
            
            {contentParts.afterThinking && (
              <Typography variant="body1">{contentParts.afterThinking}</Typography>
            )}
          </>
        ) : (
          <Typography variant="body1">{contentParts.content}</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default MessageBubble; 