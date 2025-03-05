import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// Define types
type Message = {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
};

type ChatContextType = {
  messages: Message[];
  addMessage: (message: Message) => void;
  sendMessage: (content: string, fileId: string | null) => Promise<void>;
  isLoading: boolean;
  isPdfReady: boolean;
  setIsPdfReady: (ready: boolean) => void;
  currentFileId: string | null;
  setCurrentFileId: (fileId: string | null) => void;
};

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Context provider
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfReady, setIsPdfReady] = useState(true);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);

  // Listen for PDF uploaded event
  useEffect(() => {
    const handlePdfUpload = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.fileId) {
        setCurrentFileId(customEvent.detail.fileId);
        setIsPdfReady(true);
      }
    };

    window.addEventListener('pdfUploaded', handlePdfUpload);
    
    // Ensure isPdfReady is always true
    setIsPdfReady(true);
    
    return () => window.removeEventListener('pdfUploaded', handlePdfUpload);
  }, []);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const sendMessage = async (content: string, fileId: string | null) => {
    if (!content.trim()) return;

    // Add user message to chat
    const userMessage: Message = {
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);
    
    setIsLoading(true);
    
    try {
      // Use streaming endpoint if fileId is available
      if (fileId) {
        const response = await fetch(`${API_BASE_URL}/api/chat/rag/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: content,
            fileId: fileId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response from the server');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        // Create a new message for the assistant's response
        const assistantMessage: Message = {
          type: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMessage);

        // Read the stream and update the message incrementally
        const decoder = new TextDecoder();
        let done = false;
        
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          
          if (done) break;
          
          const text = decoder.decode(value);
          
          // Update the assistant's message with the new content
          setMessages(msgs => {
            const updatedMsgs = [...msgs];
            const lastIndex = updatedMsgs.length - 1;
            if (lastIndex >= 0 && updatedMsgs[lastIndex].type === 'assistant') {
              updatedMsgs[lastIndex] = {
                ...updatedMsgs[lastIndex],
                content: updatedMsgs[lastIndex].content + text,
              };
            }
            return updatedMsgs;
          });
        }
      } else {
        // For cases where no PDF is loaded, provide a helpful response
        const assistantMessage: Message = {
          type: 'assistant',
          content: 'I notice you haven\'t uploaded a PDF yet. Please upload a PDF to ask questions about it, or ask me general questions.',
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        type: 'system',
        content: 'Sorry, there was an error processing your request.',
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider value={{ 
      messages, 
      addMessage, 
      sendMessage, 
      isLoading, 
      isPdfReady, 
      setIsPdfReady,
      currentFileId,
      setCurrentFileId
    }}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook for using the chat context
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

// Add default export to fix import in App.tsx
export default ChatProvider; 