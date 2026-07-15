import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true, // expose to network (same WiFi devices can access)
      // Proxy API calls to the backend during local development so the
      // frontend can call relative paths like /api/... with no CORS setup.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
          ws: true, // proxy WebSocket (socket.io) connections too
        },
        // Proxy uploaded files so relative /uploads/* paths work on any device
        '/uploads': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
