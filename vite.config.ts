import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy: forwards /api to localhost gateway.
    // In production, the console uses the gateway URL from localStorage directly
    // (configured via Settings / SetupScreen), so no proxy is needed.
    proxy: {
      '/api': {
        target: 'http://localhost:18789',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
