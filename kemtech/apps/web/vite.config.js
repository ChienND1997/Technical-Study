import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the web app runs on :5173 and proxies /api to the API on :3000 (same origin, so no CORS to worry about).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // Suppress benign connection aborts when browser refreshes or closes tabs
            if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err.code)) return;
            console.error('[vite proxy error]', err.message);
          });
        },
      },
    },
  },
  build: { chunkSizeWarningLimit: 1500 },
});