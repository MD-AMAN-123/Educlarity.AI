import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This prevents Vite from trying to bundle the server-side 'api' folder
    rollupOptions: {
      external: [/^\/api\/.*/]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      // Local development proxy for the backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});
