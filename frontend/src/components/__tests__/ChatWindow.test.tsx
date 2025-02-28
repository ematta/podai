import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatWindow from '../ChatWindow';
import { ChatMessage } from '../../types/index';

// Mock scrollIntoView function for testing scroll behavior
beforeEach(() => {
  // Create a mock implementation of scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

describe('ChatWindow Component', () => {
  it('displays empty state message when no messages', () => {
    render(<ChatWindow messages={[]} isLoading={false} progress={0} />);
    
    expect(screen.getByText('No messages yet. Ask a question about your PDF.')).toBeInTheDocument();
  });
  
  it('displays user message correctly', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'What is the main topic of this paper?' }
    ];
    
    render(<ChatWindow messages={messages} isLoading={false} progress={0} />);
    
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('What is the main topic of this paper?')).toBeInTheDocument();
  });
  
  it('displays assistant message correctly', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'The main topic is artificial intelligence.' }
    ];
    
    render(<ChatWindow messages={messages} isLoading={false} progress={0} />);
    
    expect(screen.getByText('Assistant')).toBeInTheDocument();
    expect(screen.getByText('The main topic is artificial intelligence.')).toBeInTheDocument();
  });
  
  it('displays system message correctly', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'There was an error processing your request.' }
    ];
    
    render(<ChatWindow messages={messages} isLoading={false} progress={0} />);
    
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('There was an error processing your request.')).toBeInTheDocument();
  });
  
  it('displays loading indicator when isLoading is true', () => {
    render(<ChatWindow messages={[]} isLoading={true} progress={50} />);
    
    expect(screen.getByText('Processing... 50%')).toBeInTheDocument();
  });
  
  it('displays generic loading message when isLoading is true and progress is 0', () => {
    render(<ChatWindow messages={[]} isLoading={true} progress={0} />);
    
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });
  
  it('displays sources when provided', () => {
    const messages: ChatMessage[] = [
      { 
        role: 'assistant', 
        content: 'The main topic is artificial intelligence.',
        sources: ['page 1', 'page 5'] 
      }
    ];
    
    render(<ChatWindow messages={messages} isLoading={false} progress={0} />);
    
    expect(screen.getByText('Sources: page 1, page 5')).toBeInTheDocument();
  });
  
  it('calls scrollIntoView when messages change', () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Test message' }
    ];
    
    render(<ChatWindow messages={messages} isLoading={false} progress={0} />);
    
    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});
