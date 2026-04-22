import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Stable Vite 5 Configuration
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false, // Prevents CSS chunking issues
    rollupOptions: {
      output: {
        manualChunks: () => 'app.js', // Forces everything into one stable bundle
      },
    },
  },
});
