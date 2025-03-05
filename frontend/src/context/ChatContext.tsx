import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { API_BASE_URL } from '../config';

/**
 * Represents a chat message in the application
 * @typedef {Object} Message
 * @property {'user' | 'assistant' | 'system'} type - The type of message sender
 * @property {string} content - The content of the message
 * @property {string} timestamp - ISO timestamp when the message was created
 */
type Message = {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
};

/**
 * Type definition for the chat context
 * @typedef {Object} ChatContextType
 * @property {Message[]} messages - Array of chat messages
 * @property {function} addMessage - Function to add a new message to the chat
 * @property {function} sendMessage - Function to send a message to the assistant
 * @property {boolean} isLoading - Flag indicating if a message is being processed
 * @property {boolean} isPdfReady - Flag indicating if a PDF is ready for chat
 * @property {function} setIsPdfReady - Function to set the PDF ready state
 * @property {string|null} currentFileId - ID of the currently loaded PDF file
 * @property {function} setCurrentFileId - Function to set the current file ID
 */
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

/**
 * Creates a new message object with the specified type and content
 * @param {string} content - The message content
 * @param {'user' | 'assistant' | 'system'} type - The message type
 * @returns {Message} A new message object with timestamp
 */
const createMessage = (content: string, type: 'user' | 'assistant' | 'system'): Message => ({
  type,
  content,
  timestamp: new Date().toISOString(),
});

/**
 * ChatProvider component that provides chat functionality to its children
 * @component
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {JSX.Element} Chat provider component
 */
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfReady, setIsPdfReady] = useState(true);
  const [currentFileId, setCurrentFileId] = useState<string | null>(() => {
    // Initialize from localStorage if available
    const savedFileId = localStorage.getItem('currentPdfFileId');
    return savedFileId || null;
  });

  /**
   * Persist currentFileId to localStorage when it changes
   */
  useEffect(() => {
    if (currentFileId) {
      localStorage.setItem('currentPdfFileId', currentFileId);
    } else {
      localStorage.removeItem('currentPdfFileId');
    }
  }, [currentFileId]);

  /**
   * Event handler for PDF upload events
   * Updates state when a PDF is uploaded successfully
   */
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

  /**
   * Check if a stored PDF is available on mount
   */
  useEffect(() => {
    const checkStoredPdf = async () => {
      if (currentFileId) {
        try {
          // Dispatch an event to inform the app a PDF is ready
          const pdfUploadedEvent = new CustomEvent('pdfUploaded', {
            detail: { 
              fileId: currentFileId,
              fileName: currentFileId,
              fromStorage: true
            }
          });
          window.dispatchEvent(pdfUploadedEvent);
          
          // Add a system message
          const systemMessage = createMessage(
            'Previous PDF loaded and ready for chat.',
            'system'
          );
          addMessage(systemMessage);
        } catch (error) {
          console.error('Error loading stored PDF:', error);
          setCurrentFileId(null);
        }
      }
    };
    
    checkStoredPdf();
  }, []);

  /**
   * Adds a message to the chat history
   * @param {Message} message - The message to add
   */
  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  /**
   * Processes a streaming response from the server and updates the UI incrementally
   * @param {Response} response - The fetch API response object
   * @returns {Promise<void>}
   */
  const processStreamingResponse = async (response: Response): Promise<void> => {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    // Create a new message for the assistant's response
    const assistantMessage = createMessage('', 'assistant');
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
  };

  /**
   * Makes a request to the chat API with the provided message and fileId
   * @param {string} content - The user's message
   * @param {string} fileId - The ID of the current PDF file
   * @returns {Promise<Response>} The fetch response
   */
  const makeChatApiRequest = async (content: string, fileId: string): Promise<Response> => {
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

    return response;
  };

  /**
   * Handles the case when no PDF is loaded
   */
  const handleNoPdfCase = () => {
    const assistantMessage = createMessage(
      'I notice you haven\'t uploaded a PDF yet. Please upload a PDF to ask questions about it, or ask me general questions.',
      'assistant'
    );
    addMessage(assistantMessage);
  };

  /**
   * Handles errors during message sending
   * @param {unknown} error - The error that occurred
   */
  const handleSendError = (error: unknown) => {
    console.error('Error sending message:', error);
    
    // Add error message to chat
    const errorMessage = createMessage(
      'Sorry, there was an error processing your request.',
      'system'
    );
    addMessage(errorMessage);
  };

  /**
   * Sends a user message and processes the response
   * @param {string} content - The user's message content
   * @param {string|null} fileId - The ID of the current PDF file, if any
   * @returns {Promise<void>}
   */
  const sendMessage = async (content: string, fileId: string | null) => {
    if (!content.trim()) return;

    // Add user message to chat
    const userMessage = createMessage(content, 'user');
    addMessage(userMessage);
    
    setIsLoading(true);
    
    try {
      // Use either the provided fileId or the one in our state (which may be from localStorage)
      const pdfFileId = fileId || currentFileId;
      
      // Use streaming endpoint if a fileId is available
      if (pdfFileId) {
        const response = await makeChatApiRequest(content, pdfFileId);
        await processStreamingResponse(response);
      } else {
        // For cases where no PDF is loaded, provide a helpful response
        handleNoPdfCase();
      }
    } catch (error) {
      handleSendError(error);
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

/**
 * Custom hook to access the chat context
 * @returns {ChatContextType} The chat context
 * @throws {Error} If used outside of a ChatProvider
 */
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatProvider; 