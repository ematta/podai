import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfUploader from '../PdfUploader';

describe('PdfUploader Component', () => {
  it('renders the file input and buttons', () => {
    const mockOnFileChange = vi.fn();
    const mockOnUpload = vi.fn();
    
    render(
      <PdfUploader 
        selectedFile={null} 
        isLoading={false}
        onFileChange={mockOnFileChange}
        onUpload={mockOnUpload} 
      />
    );
    
    expect(screen.getByText('Select PDF')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    // Upload button only shows when a file is selected
    expect(screen.queryByText('Process PDF for Chat')).not.toBeInTheDocument();
  });
  
  it('shows the selected file name when a file is selected', () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockOnFileChange = vi.fn();
    const mockOnUpload = vi.fn();
    
    render(
      <PdfUploader 
        selectedFile={mockFile} 
        isLoading={false}
        onFileChange={mockOnFileChange}
        onUpload={mockOnUpload} 
      />
    );
    
    // File name is shown in two separate spans
    expect(screen.getByText('Selected PDF:')).toBeInTheDocument();
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('(0.00 MB)')).toBeInTheDocument();
    expect(screen.getByText('Process PDF for Chat')).toBeInTheDocument();
  });
  
  it('disables buttons when loading', () => {
    const mockOnFileChange = vi.fn();
    const mockOnUpload = vi.fn();
    
    render(
      <PdfUploader 
        selectedFile={null} 
        isLoading={true}
        onFileChange={mockOnFileChange}
        onUpload={mockOnUpload} 
      />
    );
    
    expect(screen.getByTestId('select-file-button')).toBeDisabled();
    expect(screen.getByTestId('clear-file-button')).toBeDisabled();
    expect(screen.getByText('Processing PDF...')).toBeInTheDocument();
  });
  
  it('calls onUpload when upload button is clicked', async () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockOnFileChange = vi.fn();
    const mockOnUpload = vi.fn();
    const user = userEvent.setup();
    
    render(
      <PdfUploader 
        selectedFile={mockFile} 
        isLoading={false}
        onFileChange={mockOnFileChange}
        onUpload={mockOnUpload} 
      />
    );
    
    const uploadButton = screen.getByText('Process PDF for Chat');
    await user.click(uploadButton);
    
    expect(mockOnUpload).toHaveBeenCalledTimes(1);
  });
  
  it('calls onFileChange when a file is selected', () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockOnFileChange = vi.fn();
    const mockOnUpload = vi.fn();
    
    render(
      <PdfUploader 
        selectedFile={null} 
        isLoading={false}
        onFileChange={mockOnFileChange}
        onUpload={mockOnUpload} 
      />
    );
    
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });
    
    expect(mockOnFileChange).toHaveBeenCalledTimes(1);
  });
});
