import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['express', 'cors', 'dotenv'],
      output: {
        manualChunks: undefined, // Let Vite handle chunking to avoid Identifier errors
      },
    }
  },
  optimizeDeps: {
    exclude: ['express', 'cors', 'dotenv']
  }
});
