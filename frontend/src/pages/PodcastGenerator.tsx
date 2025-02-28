import React, { useState, useEffect } from 'react'
import { PdfUploader } from '../components/PdfUploader'
import { TabButtons } from '../components/TabButtons'
import { ContentDisplay } from '../components/ContentDisplay'
import { ChatWindow } from '../components/ChatWindow'
import { getStoredPdfs, getChatResponse, uploadPdf } from '../services/api'
import { ChatMessage } from '../types'

export const PodcastGenerator: React.FC = () => {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [script, setScript] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [currentPdfId, setCurrentPdfId] = useState('')
  const [activeTab, setActiveTab] = useState<'script' | 'markdown' | 'chat'>('script')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      setFile(null)
      return
    }

    const selectedFile = files[0]
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file')
      return
    }

    setFile(selectedFile)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const data = await uploadPdf(formData)
      setScript(data.script)
      setMarkdown(data.markdown)
      setCurrentPdfId(data.pdf_id)
      setActiveTab('script')
      setMessages([])
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!question.trim() || !currentPdfId) return

    const newMessage: ChatMessage = {
      role: 'user',
      content: question
    }

    setMessages(prev => [...prev, newMessage])
    setIsChatLoading(true)
    
    try {
      const data = await getChatResponse(currentPdfId, question)
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.response
      }

      setMessages(prev => [...prev, aiMessage])
      setQuestion('')
    } catch (err: any) {
      setError(`Chat failed: ${err.message}`)
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content)
    setError(`${type} copied to clipboard!`)
    setTimeout(() => setError(''), 3000)
  }

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <div className="main-content">
          <div className="left-panel">
            <PdfUploader
              file={file}
              isLoading={isLoading}
              error={error}
              onFileUpload={handleFileUpload}
              onUpload={handleUpload}
            />
          </div>

          <div className="right-panel">
            {activeTab === 'script' && script && (
              <ContentDisplay
                content={script}
                title="Generated Podcast Script"
                onCopy={() => handleCopy(script, 'Script')}
                isMarkdown={false}
              />
            )}
            {activeTab === 'markdown' && markdown && (
              <ContentDisplay
                content={markdown}
                title="Generated Markdown"
                onCopy={() => handleCopy(markdown, 'Markdown')}
                isMarkdown={true}
              />
            )}
            {activeTab === 'chat' && currentPdfId && (
              <ChatWindow
                messages={messages}
                question={question}
                isChatLoading={isChatLoading}
                onQuestionChange={setQuestion}
                onSendMessage={handleSendMessage}
              />
            )}
            {(!script && !markdown) && (
              <div className="placeholder-message">
                Upload a PDF to generate a podcast script and markdown
              </div>
            )}
          </div>
        </div>
        
        {(script || markdown) && (
          <div className="tab-container">
            <TabButtons
              activeTab={activeTab}
              onTabChange={setActiveTab}
              hasScript={!!script}
              hasMarkdown={!!markdown}
              hasPdf={!!currentPdfId}
            />
          </div>
        )}
      </div>
    </div>
  )
}
