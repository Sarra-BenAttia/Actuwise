import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration Vite pour ACTUWISE Frontend
// Proxy API vers FastAPI backend sur le port 8000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Redirige tous les appels /api/* vers le backend FastAPI
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  },
  // Résolution des alias pour faciliter les imports
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@services': '/src/services',
      '@hooks': '/src/hooks'
    }
  }
})
