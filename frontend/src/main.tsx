import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initDevMemoryProfiler } from './utils/memoryProfiler'

// Initialize memory profiler in development mode
if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_PROFILING === 'true') {
  initDevMemoryProfiler();
  console.log('Memory profiler initialized in development mode');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
