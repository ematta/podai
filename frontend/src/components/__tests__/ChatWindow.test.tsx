import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatWindow from '../ChatWindow';
import { ChatMessage } from '../../types/index';
import * as ChatContext from '../../context/ChatContext';
import React from 'react';

// Mock scrollIntoView function for testing scroll behavior
beforeEach(() => {
  // Create a mock implementation of scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock the useChat hook
const mockUseChat = vi.fn();
vi.mock('../../context/ChatContext', () => ({
  useChat: () => mockUseChat()
}));

describe('ChatWindow Component', () => {
  it('displays welcome message when no messages', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      isLoading: false,
      currentFileId: 'test-file-id',
      sendMessage: vi.fn()
    });
    
    render(<ChatWindow />);
    
    expect(screen.getByText('Welcome to PDF Chat Assistant.')).toBeInTheDocument();
    expect(screen.getByText('A PDF is already loaded and ready for chat!')).toBeInTheDocument();
  });
  
  it('displays user message correctly', () => {
    const messages = [
      { role: 'user', content: 'What is the main topic of this paper?' }
    ];
    
    mockUseChat.mockReturnValue({
      messages,
      isLoading: false,
      currentFileId: 'test-file-id',
      sendMessage: vi.fn()
    });
    
    render(<ChatWindow />);
    
    expect(screen.getByText('What is the main topic of this paper?')).toBeInTheDocument();
  });
  
  it('displays assistant message correctly', () => {
    const messages = [
      { role: 'assistant', content: 'The main topic is artificial intelligence.' }
    ];
    
    mockUseChat.mockReturnValue({
      messages,
      isLoading: false,
      currentFileId: 'test-file-id',
      sendMessage: vi.fn()
    });
    
    render(<ChatWindow />);
    
    expect(screen.getByText('The main topic is artificial intelligence.')).toBeInTheDocument();
  });
  
  it('displays loading indicator when isLoading is true', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      isLoading: true,
      currentFileId: 'test-file-id',
      sendMessage: vi.fn()
    });
    
    render(<ChatWindow />);
    
    // Check for the circular progress indicator
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('calls scrollIntoView when messages change', () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    
    const messages = [
      { role: 'user', content: 'Test message' }
    ];
    
    mockUseChat.mockReturnValue({
      messages,
      isLoading: false,
      currentFileId: 'test-file-id',
      sendMessage: vi.fn()
    });
    
    render(<ChatWindow />);
    
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});
