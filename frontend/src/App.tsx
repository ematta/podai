import { useState } from 'react'
import axios from 'axios'
import './App.css'

type ScriptResponse = {
  original_filename: string
  script: string
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [script, setScript] = useState('')
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

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
            <div className="progress-text">{uploadProgress}%</div>
          </div>
        )}

        {showSuccessModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Generated Podcast Script</h2>
              <div className="script-preview">
                <pre>{script}</pre>
              </div>
              <div className="modal-actions">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(script)
                    setError('Script copied to clipboard!')
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
