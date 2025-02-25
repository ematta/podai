import { useState } from 'react'
import axios from 'axios'
import './App.css'

type ScriptResponse = {
  original_filename: string
  markdown: string
  script: string
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [script, setScript] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [activeTab, setActiveTab] = useState<'markdown' | 'script'>('script')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file')
        return
      }
      setFile(selectedFile)
      setUploadProgress(0)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post<ScriptResponse>('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.loaded / (progressEvent.total ?? 0) * 100
          setUploadProgress(Math.round(progress))
        }
      })

      setScript(response.data.script)
      setMarkdown(response.data.markdown)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Upload failed:', error)
      setError('Failed to process PDF. Please try again.')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const closeModal = () => {
    setShowSuccessModal(false)
  }

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <h1>PDF to Podcast Script Converter</h1>
        <div className="main-content">
          <div className="left-panel">
            <div className="upload-section">
              <input
                type="file"
                id="file-upload"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isLoading}
              />
              <label 
                htmlFor="file-upload" 
                className={`upload-button ${isLoading ? 'disabled' : ''}`}
              >
                {isLoading ? 'Processing...' : (file ? file.name : 'Choose PDF')}
              </label>
              {file && !isLoading && (
                <button 
                  onClick={handleUpload} 
                  className="process-button"
                  disabled={isLoading}
                >
                  Convert to Podcast Script
                </button>
              )}
              {error && <div className="error-message">{error}</div>}
            </div>

            {script && (
              <div className="script-display">
                <h2>Generated Podcast Script</h2>
                <div className="script-actions">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(script)
                      setError('Script copied to clipboard!')
                      setTimeout(() => setError(''), 3000)
                    }}
                    className="copy-button"
                  >
                    Copy Script
                  </button>
                </div>
                <textarea
                  value={script}
                  readOnly
                  className="script-textarea"
                  placeholder="Your generated podcast script will appear here..."
                />
              </div>
            )}
          </div>

          <div className="right-panel">
            <div className="markdown-display">
              <h2>PDF Content (Markdown)</h2>
              <div className="markdown-actions">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(markdown)
                    setError('Markdown copied to clipboard!')
                    setTimeout(() => setError(''), 3000)
                  }}
                  className="copy-button"
                >
                  Copy Markdown
                </button>
              </div>
              <textarea
                value={markdown}
                readOnly
                className="markdown-textarea"
                placeholder="Extracted PDF content will appear here..."
              />
            </div>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
              <div className="progress-text">{uploadProgress}%</div>
            </div>
          )}
        </div>



        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeTab === 'markdown' ? 'active' : ''}`}
                  onClick={() => setActiveTab('markdown')}
                >
                  Markdown
                </button>
                <button 
                  className={`tab-button ${activeTab === 'script' ? 'active' : ''}`}
                  onClick={() => setActiveTab('script')}
                >
                  Podcast Script
                </button>
              </div>
              
              <div className="content-preview">
                {activeTab === 'markdown' ? (
                  <div className="markdown-preview">
                    <pre>{markdown}</pre>
                  </div>
                ) : (
                  <div className="script-preview">
                    <pre>{script}</pre>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={() => {
                    const content = activeTab === 'markdown' ? markdown : script;
                    navigator.clipboard.writeText(content)
                    setError(`${activeTab === 'markdown' ? 'Markdown' : 'Script'} copied to clipboard!`)
                    setTimeout(() => setError(''), 3000)
                  }} 
                  className="copy-button"
                >
                  Copy to Clipboard
                </button>
                <button onClick={closeModal} className="close-button">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
