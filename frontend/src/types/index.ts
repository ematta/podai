export type ScriptResponse = {
  pdf_id: string
  original_filename: string
  markdown: string
  script: string
}

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export type PDFList = {
  pdf_ids: string[]
}
