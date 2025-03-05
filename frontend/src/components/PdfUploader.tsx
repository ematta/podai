import React, { useRef, useState } from 'react'

/**
 * Props for the PdfUploader component
 * @interface Props
 * @property {File | null} selectedFile - Currently selected PDF file, if any
 * @property {boolean} isLoading - Whether a file is currently being processed
 * @property {function} onFileChange - Handler for file input changes
 * @property {function} onUpload - Handler for upload button click
 */
interface Props {
  selectedFile: File | null
  isLoading: boolean
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
}

/**
 * Props for the FileInfo component
 * @interface FileInfoProps
 * @property {File} file - The file to display information about
 */
interface FileInfoProps {
  file: File
}

/**
 * Props for the UploadControls component
 * @interface UploadControlsProps
 * @property {boolean} isLoading - Whether a file is currently being processed
 * @property {boolean} hasFile - Whether a file is currently selected
 * @property {React.RefObject<HTMLInputElement>} fileInputRef - Reference to the file input
 * @property {function} onClear - Handler for clear button click
 */
interface UploadControlsProps {
  isLoading: boolean
  hasFile: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onClear: () => void
}

/**
 * Displays information about the selected PDF file
 * @component
 * @param {FileInfoProps} props - Component props
 * @returns {JSX.Element} File information display
 */
const FileInfo: React.FC<FileInfoProps> = ({ file }) => {
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
  
  return (
    <div className="file-info" data-testid="selected-file-info">
      <span className="file-label" data-testid="selected-file-label">Selected PDF: </span>
      <span className="file-name" data-testid="selected-file-name">{file.name}</span>
      <span className="file-size" data-testid="selected-file-size">({fileSizeMB} MB)</span>
    </div>
  )
}

/**
 * Displays the PDF selection and clear buttons
 * @component
 * @param {UploadControlsProps} props - Component props
 * @returns {JSX.Element} Upload control buttons
 */
const UploadControls: React.FC<UploadControlsProps> = ({ 
  isLoading, 
  hasFile, 
  fileInputRef, 
  onClear 
}) => {
  return (
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
        onClick={onClear} 
        className="clear-button"
        disabled={isLoading || !hasFile}
        data-testid="clear-file-button"
      >
        Clear
      </button>
    </div>
  )
}

/**
 * Component for uploading and processing PDF files
 * Allows users to select a PDF, displays information about the selected file,
 * and provides a button to upload the file for processing
 * 
 * @component
 * @param {Props} props - Component props
 * @returns {JSX.Element} PDF uploader interface
 */
const PdfUploader: React.FC<Props> = ({
  selectedFile,
  isLoading,
  onFileChange,
  onUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{message: string; type: 'info' | 'success'} | null>(null);

  /**
   * Triggers a click on the hidden file input
   */
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Handles clearing the selected file
   * Creates a mock change event to reset the file selection
   */
  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Clear any notification
    setNotification(null);
    
    // Create a partial mock event with just the necessary properties
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

  /**
   * Handles the PDF upload with duplicate checking
   * Checks if the PDF already exists in the repository before processing
   */
  const handleUploadWithDuplicateCheck = async () => {
    if (!selectedFile) return;
    
    // Clear any previous notification
    setNotification(null);
    
    // Call the onUpload function which will handle the duplicate check
    // The backend will check if the PDF already exists using MD5 hash
    onUpload();
    
    // Note: The actual notification will be set by the parent component 
    // after it receives the response from the backend
    // This is just a pass-through to the parent's onUpload handler
  };

  return (
    <div className="upload-section" data-testid="pdf-uploader">
      <h2>Upload PDF for Chat Analysis</h2>
      
      <input
        type="file"
        id="file-upload"
        accept=".pdf"
        onChange={(e) => {
          setNotification(null); // Clear notification on new file selection
          onFileChange(e);
        }}
        style={{ display: 'none' }}
        disabled={isLoading}
        ref={fileInputRef}
        data-testid="file-input"
      />
      
      <div className="upload-controls">
        <button 
          onClick={handleSelectFile} 
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
      
      {selectedFile && <FileInfo file={selectedFile} />}
      
      {notification && (
        <div 
          className={`notification ${notification.type}`}
          data-testid="pdf-notification"
        >
          {notification.message}
        </div>
      )}
      
      {selectedFile && !isLoading && (
        <button 
          onClick={handleUploadWithDuplicateCheck} 
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
        }
        
        .convert-button {
          background-color: #4caf50;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 4px;
          font-weight: bold;
          margin-top: 10px;
          cursor: pointer;
        }
        
        .convert-button:hover {
          background-color: #43a047;
        }
        
        .loading-indicator {
          background-color: #fff3cd;
          border: 1px solid #ffeeba;
          color: #856404;
          padding: 10px 15px;
          border-radius: 4px;
          margin-top: 15px;
          text-align: center;
        }
        
        .notification {
          padding: 10px 15px;
          border-radius: 4px;
          margin: 10px 0;
        }
        
        .notification.info {
          background-color: #e3f2fd;
          border: 1px solid #bbdefb;
          color: #0d47a1;
        }
        
        .notification.success {
          background-color: #e8f5e9;
          border: 1px solid #c8e6c9;
          color: #1b5e20;
        }
      `}</style> */}
    </div>
  )
}

export default PdfUploader
