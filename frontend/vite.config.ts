import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Use esbuild for both minification and building
    minify: 'esbuild',
    target: 'es2020',
    // Customize esbuild options
    rollupOptions: {
      // Omit Rollup-specific options
      output: {
        manualChunks: undefined, // Let esbuild handle chunking
      },
    },
  },
  esbuild: {
    // ESBuild options
    legalComments: 'none',
    target: 'es2020',
    jsx: 'automatic', // Use React automatic JSX transform
    jsxImportSource: 'react',
    // Drop console logs in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  define: {
    'process.env.API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8081')
  }
})
