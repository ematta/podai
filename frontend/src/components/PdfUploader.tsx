import React, { useRef } from 'react'

type Props = {
  file: File | null
  isLoading: boolean
  error: string
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
}

export const PdfUploader: React.FC<Props> = ({
  file,
  isLoading,
  error,
  onFileUpload,
  onUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Reset file state by triggering a change event with no files
    onFileUpload({ target: { files: null } } as any);
  };

  return (
    <div className="upload-section">
      <input
        type="file"
        id="file-upload"
        accept=".pdf"
        onChange={onFileUpload}
        style={{ display: 'none' }}
        disabled={isLoading}
        ref={fileInputRef}
      />
      
      <div className="upload-controls">
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="upload-button"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Upload'}
        </button>
        
        <button 
          onClick={handleClear} 
          className="clear-button"
          disabled={isLoading}
        >
          Clear
        </button>
      </div>
      
      <div className="pdf-name-container">
        <input 
          type="text" 
          className="pdf-name-input"
          value={file ? file.name : 'PDF Name'}
          readOnly
        />
        <button className="edit-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </button>
      </div>
      
      <div className="pdf-preview-container">
        {/* PDF Preview area */}
        {isLoading && <div className="loading-indicator">Processing PDF...</div>}
      </div>
      
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button 
            className="dismiss-error"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )}
      
      {file && !error && !isLoading && (
        <button 
          onClick={onUpload} 
          className="process-button"
          disabled={isLoading}
        >
          Convert PDF
        </button>
      )}
    </div>
  )
}
