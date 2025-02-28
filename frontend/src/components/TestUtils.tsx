import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';

/**
 * A utility component for testing with sample PDFs
 */
interface TestUtilsProps {
  onTestPdfSelect: (pdfPath: string) => void;
}

const TestUtils: React.FC<TestUtilsProps> = ({ onTestPdfSelect }) => {
  const testPdfs = [
    {
      name: 'Physics Paper (2412.14135v1.pdf)',
      path: '/node-backend/test/data/2412.14135v1.pdf'
    },
    {
      name: 'Space PDF (05-versions-space.pdf)',
      path: '/node-backend/test/data/05-versions-space.pdf'
    }
  ];

  return (
    <Paper sx={{ p: 2, mb: 2, mt: 2 }} data-testid="test-utils-container">
      <Typography variant="h6" component="h2" gutterBottom data-testid="test-utils-title">
        Test Utilities
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }} data-testid="test-utils-description">
        For testing, you can use these pre-loaded PDFs:
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }} data-testid="test-pdfs-container">
        {testPdfs.map((pdf, index) => (
          <Button 
            key={index}
            variant="outlined"
            onClick={() => onTestPdfSelect(pdf.path)}
            data-testid={`test-pdf-${index}`}
          >
            {pdf.name}
          </Button>
        ))}
      </Box>
    </Paper>
  );
};

export default TestUtils;
