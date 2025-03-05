import { useState } from 'react'
import api from '../services/api'

export const usePdfManager = () => {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentPdfId, setCurrentPdfId] = useState<string>('')
  const [storedPdfs, setStoredPdfs] = useState<string[]>([])
  const [isDuplicate, setIsDuplicate] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file')
        return
      }
      setFile(selectedFile)
      setUploadProgress(0)
      setProgressMessage('')
      setError('')
      setIsDuplicate(false)
    } else {
      setFile(null)
    }
  }

  const loadStoredPdfs = async () => {
    try {
      const data = await api.getStoredPdfs()
      setStoredPdfs(data)
    } catch (error) {
      console.error('Failed to load PDFs:', error)
      setError('Failed to load stored PDFs')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setError('')
    setUploadProgress(0)
    setProgressMessage('')
    setIsDuplicate(false)

    try {
      const result = await api.uploadPdfWithEmbeddings(file, (progress, message) => {
        setUploadProgress(progress)
        setProgressMessage(message)
      })
      
      setCurrentPdfId(result.fileId)
      
      // Check if this was a duplicate PDF
      if (result.duplicate) {
        setIsDuplicate(true)
        setProgressMessage('PDF already exists in repository. Loaded from ChromaDB.')
        setUploadProgress(100)
      }
      
      // Refresh the list of PDFs after successful upload
      await loadStoredPdfs()
      
      // Return the file ID and duplicate status
      return {
        fileId: result.fileId,
        duplicate: result.duplicate || false
      }
    } catch (error: unknown) {
      console.error('Error uploading PDF:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to upload PDF'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setUploadProgress(0)
    setProgressMessage('')
    setError('')
    setIsDuplicate(false)
  }

  return {
    file,
    uploadProgress,
    progressMessage,
    error,
    isLoading,
    currentPdfId,
    storedPdfs,
    isDuplicate,
    handleFileUpload,
    handleUpload,
    loadStoredPdfs,
    clearFile
  }
}
