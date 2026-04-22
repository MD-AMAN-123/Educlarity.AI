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
    commonjsOptions: {
      transformMixedEsModules: true, // Helps with library compatibility
    },
    rollupOptions: {
      external: ['express', 'cors', 'dotenv'],
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    exclude: ['express', 'cors', 'dotenv']
  }
});
