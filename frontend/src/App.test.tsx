import { render, screen } from '@testing-library/react';
import App from './App';

describe('App component', () => {
  test('renders the PDF Chat Assistant title', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/PDF Chat Assistant/i);
    expect(titleElements.length).toBeGreaterThan(0);
  });

  // Add more tests as needed
}); 