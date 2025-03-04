import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8081',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Using modern Sass module system
        additionalData: ''
      }
    }
  },
  resolve: {
    alias: {
      '@styles': path.resolve(__dirname, './src/styles')
    }
  }
})
