import React from 'react'
import { ChatMessage } from '../types'

type Props = {
  messages: ChatMessage[]
  question: string
  isChatLoading: boolean
  onQuestionChange: (value: string) => void
  onSendMessage: () => void
}

export const ChatWindow: React.FC<Props> = ({
  messages,
  question,
  isChatLoading,
  onQuestionChange,
  onSendMessage
}) => {
  return (
    <div className="chat-window">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">
              <strong>{message.role === 'user' ? 'You' : 'Assistant'}:</strong>
              <p>{message.content}</p>
            </div>
            {message.sources && (
              <div className="message-sources">
                <h4>Sources:</h4>
                {message.sources.map((source, idx) => (
                  <div key={idx} className="source">{source}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder="Ask a question about the PDF..."
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && onSendMessage()}
          disabled={isChatLoading}
          className="chat-textarea"
        />
        <button
          onClick={onSendMessage}
          disabled={!question.trim() || isChatLoading}
          className="send-button"
        >
          {isChatLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
