import React from 'react'

type Props = {
  storedPdfs: string[]
  currentPdfId: string
  onPdfSelect: (pdfId: string) => void
}

export const StoredPdfList: React.FC<Props> = ({
  storedPdfs,
  currentPdfId,
  onPdfSelect
}) => {
  return (
    <div className="stored-pdfs">
      <h3>Stored PDFs</h3>
      <div className="pdf-list">
        {storedPdfs.map(pdfId => (
          <button
            key={pdfId}
            onClick={() => onPdfSelect(pdfId)}
            className={`pdf-button ${currentPdfId === pdfId ? 'active' : ''}`}
          >
            {pdfId}
          </button>
        ))}
      </div>
    </div>
  )
}
