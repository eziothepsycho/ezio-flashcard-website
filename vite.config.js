import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The Laravel API runs alongside the site in development
      // (php artisan serve --port=8001). Proxying keeps the browser on a single
      // origin, so requests to /api need no CORS setup.
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
