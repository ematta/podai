import { useState } from 'react'
import axios from 'axios'
import { ScriptResponse, PDFList } from '../types'

export const usePdfManager = () => {
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [script, setScript] = useState('')
  const [markdown, setMarkdown] = useState('')
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
      const response = await axios.get<PDFList>('http://localhost:8081/pdfs')
      setStoredPdfs(response.data.pdf_ids)
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
      const response = await axios.post<ScriptResponse>('http://localhost:8081/upload', formData, {
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
      setCurrentPdfId(response.data.pdf_id)
      loadStoredPdfs() // Refresh the list of PDFs
      return response.data
    } catch (error) {
      console.error('Upload failed:', error)
      setError('Failed to process PDF. Please try again.')
      throw error
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  return {
    file,
    uploadProgress,
    script,
    markdown,
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
