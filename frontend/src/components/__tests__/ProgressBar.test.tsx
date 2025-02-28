import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../ProgressBar';

describe('ProgressBar Component', () => {
  it('renders with default props', () => {
    render(<ProgressBar progress={50} />);
    
    const progressBarContainer = screen.getByTestId('progress-bar-container');
    const progressBarInner = screen.getByTestId('progress-bar-inner');
    
    expect(progressBarContainer).toBeInTheDocument();
    expect(progressBarInner).toHaveStyle('width: 50%');
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
  
  it('renders with 0% progress', () => {
    render(<ProgressBar progress={0} />);
    
    const progressBarInner = screen.getByTestId('progress-bar-inner');
    expect(progressBarInner).toHaveStyle('width: 0%');
    // Should not show percentage text when below 10%
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
  
  it('renders with 100% progress', () => {
    render(<ProgressBar progress={100} />);
    
    const progressBarInner = screen.getByTestId('progress-bar-inner');
    expect(progressBarInner).toHaveStyle('width: 100%');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
  
  it('clamps progress values above 100', () => {
    render(<ProgressBar progress={150} />);
    
    const progressBarInner = screen.getByTestId('progress-bar-inner');
    expect(progressBarInner).toHaveStyle('width: 100%');
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
  
  it('clamps progress values below 0', () => {
    render(<ProgressBar progress={-25} />);
    
    const progressBarInner = screen.getByTestId('progress-bar-inner');
    expect(progressBarInner).toHaveStyle('width: 0%');
    // Should not show percentage text when below 10%
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
  
  it('displays label when provided', () => {
    const testLabel = 'Processing PDF...';
    render(<ProgressBar progress={75} label={testLabel} />);
    
    expect(screen.getByTestId('progress-label')).toHaveTextContent(testLabel);
  });
});
