import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * Main application entry point
 * Mounts the React application to the DOM
 * 
 * Includes error handling to help debug mounting issues and
 * displays user-friendly error messages if mounting fails
 */
try {
  // Get root element
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    console.error('Root element not found. Make sure there is a div with id "root" in index.html');
    document.body.innerHTML = '<div style="color:red;padding:20px;">Error: Root element not found</div>';
  } else {
    // Create root and render
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('React app mounted successfully');
  }
} catch (error) {
  console.error('Error mounting React app:', error);
  document.body.innerHTML = '<div style="color:red;padding:20px;">Error mounting React app</div>';
}
