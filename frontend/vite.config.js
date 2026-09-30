import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  // MapLibre GL v6 uses a Web Worker (.mjs) that Vite cannot pre-bundle.
  // Excluding it from optimization allows the worker to be resolved at runtime.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  // Ensure the worker can be served correctly
  worker: {
    format: 'es',
  },
});
