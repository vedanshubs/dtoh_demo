import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/analytics': {
        target: 'http://localhost:8006',
        rewrite: path => path.replace('/api/analytics', '/api'),
      },
      '/api': 'http://localhost:8005',
      '/actions': 'http://localhost:8005',
    },
  },
})
