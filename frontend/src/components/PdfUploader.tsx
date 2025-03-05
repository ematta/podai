import React, { useRef } from 'react'

type Props = {
  selectedFile: File | null
  isLoading: boolean
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
}

const PdfUploader: React.FC<Props> = ({
  selectedFile,
  isLoading,
  onFileChange,
  onUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Create a partial mock event with just the necessary properties
    // This is a pragmatic approach that avoids using 'any' while focusing on what's actually needed
    const mockEvent = {
      target: {
        files: null,
        value: '',
        name: fileInputRef.current?.name || 'file-upload',
        type: 'file'
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onFileChange(mockEvent);
  };

  return (
    <div className="upload-section" data-testid="pdf-uploader">
      <h2>Upload PDF for Chat Analysis</h2>
      
      <input
        type="file"
        id="file-upload"
        accept=".pdf"
        onChange={onFileChange}
        style={{ display: 'none' }}
        disabled={isLoading}
        ref={fileInputRef}
        data-testid="file-input"
      />
      
      <div className="upload-controls">
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="upload-button"
          disabled={isLoading}
          data-testid="select-file-button"
        >
          Select PDF
        </button>
        
        <button 
          onClick={handleClear} 
          className="clear-button"
          disabled={isLoading || !selectedFile}
          data-testid="clear-file-button"
        >
          Clear
        </button>
      </div>
      
      {selectedFile && (
        <div className="file-info" data-testid="selected-file-info">
          <span className="file-label" data-testid="selected-file-name">Selected PDF: </span>
          <span className="file-name" data-testid="selected-file-name">{selectedFile.name}</span>
          <span className="file-size" data-testid="selected-file-size">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
        </div>
      )}
      
      {selectedFile && !isLoading && (
        <button 
          onClick={onUpload} 
          className="convert-button"
          data-testid="upload-button"
        >
          Process PDF for Chat
        </button>
      )}
      
      {isLoading && <div className="loading-indicator" data-testid="loading-indicator">Processing PDF...</div>}
      
      {/* <style jsx>{`
        .upload-section {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        h2 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 18px;
          color: #333;
        }
        
        .upload-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .upload-button {
          background-color: #4a8df8;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .clear-button {
          background-color: #f0f0f0;
          color: #666;
          border: 1px solid #ddd;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .file-info {
          background-color: #fff;
          padding: 10px 15px;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .file-label {
          font-weight: bold;
          margin-right: 5px;
        }
        
        .file-name {
          color: #2196f3;
          margin-right: 5px;
          word-break: break-all;
        }
        
        .convert-button {
          background-color: #4caf50;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
          font-size: 16px;
          margin-top: 10px;
        }
        
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style> */}
    </div>
  )
}

export default PdfUploader
