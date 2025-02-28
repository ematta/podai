import { useState } from 'react'
import axios from 'axios'
import { ChatMessage } from '../types/index'

export const useChat = (pdfId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendMessage = async () => {
    if (!question.trim() || !pdfId || isChatLoading) return

    const userMessage: ChatMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    setQuestion('')
    setIsChatLoading(true)

    try {
      const response = await axios.post(`http://localhost:8081/chat/${pdfId}`, {
        question
      })

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat failed:', error)
      setError('Failed to get response. Please try again.')
    } finally {
      setIsChatLoading(false)
    }
  }

  return {
    messages,
    question,
    isChatLoading,
    error,
    setQuestion,
    handleSendMessage,
    setMessages
  }
}
