import { useState } from 'react'
import { ChatMessage } from '../types'
import { API_BASE_URL } from '../config'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addMessage = (content: string, type: 'user' | 'assistant' | 'system') => {
    const message: ChatMessage = {
      type,
      content,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, message])
    return message
  }

  const sendMessage = async (content: string) => {
    if (!content.trim()) return
    
    // Add user message
    addMessage(content, 'user')
    setIsLoading(true)
    
    try {
      // Send to backend
      const response = await fetch(`${API_BASE_URL}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Add response message
        addMessage(data.response, 'assistant')
      } else {
        throw new Error(data.message || 'Failed to get response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addMessage('Sorry, there was an error processing your request.', 'system')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages,
    sendMessage,
    isLoading,
  }
}
