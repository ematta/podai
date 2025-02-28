import { useState } from 'react'
import { PDFList } from '../types'

// Define the ScriptResponse type locally since it needs specific fields
interface ScriptResponse {
  id: string;
  script: string;
}

export const usePdfManager = () => {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [script, setScript] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentPdfId, setCurrentPdfId] = useState<string>('')
  const [storedPdfs, setStoredPdfs] = useState<string[]>([])

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

  const loadStoredPdfs = async () => {
    try {
      const response = await fetch('http://localhost:8081/pdfs')
      if (!response.ok) {
        throw new Error('Failed to load PDFs')
      }
      const data = await response.json() as PDFList
      setStoredPdfs(data.pdf_ids)
    } catch (error) {
      console.error('Failed to load PDFs:', error)
      setError('Failed to load stored PDFs')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setError('')
    const formData = new FormData()
    formData.append('file', file)

    try {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', 'http://localhost:8081/upload', true)
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          setUploadProgress(Math.round(progress))
        }
      }
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText) as ScriptResponse
          setScript(response.script)
          setCurrentPdfId(response.id)
          loadStoredPdfs() // Refresh the list of PDFs
        } else {
          setError('Upload failed')
        }
        setIsLoading(false)
      }
      
      xhr.onerror = () => {
        setError('Upload failed due to network error')
        setIsLoading(false)
      }
      
      xhr.send(formData)
      
      return null // This function no longer returns the response data
    } catch (error: any) {
      console.error('Error uploading PDF:', error)
      setError(error.message || 'Failed to upload PDF')
      setIsLoading(false)
      return null
    }
  }

  return {
    file,
    uploadProgress,
    script,
    error,
    isLoading,
    currentPdfId,
    storedPdfs,
    handleFileUpload,
    handleUpload,
    loadStoredPdfs,
    setCurrentPdfId,
    setError
  }
}
