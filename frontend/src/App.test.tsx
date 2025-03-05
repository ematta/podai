import { render, screen } from '@testing-library/react';
import App from './App';

describe('App component', () => {
  test('renders the PDF Chat Assistant title', () => {
    render(<App />);
    const titleElement = screen.getByText(/PDF Chat Assistant/i);
    expect(titleElement).toBeInTheDocument();
  });

  // Add more tests as needed
}); 