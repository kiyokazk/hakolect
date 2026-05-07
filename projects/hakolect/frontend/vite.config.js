import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hakolect/',
  server: {
    proxy: {
      '/api': {
        // For local dev: defaults to localhost:8000
        // Docker Compose dev: set VITE_PROXY_TARGET=http://backend:8000
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
