import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyMaplibreWorkerPlugin() {
  return {
    name: 'copy-maplibre-worker',
    generateBundle() {
      const distDir = path.resolve(__dirname, 'node_modules/maplibre-gl/dist');
      const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
      for (const file of files) {
        const filePath = path.join(distDir, file);
        if (fs.existsSync(filePath)) {
          this.emitFile({
            type: 'asset',
            fileName: `assets/${file}`,
            source: fs.readFileSync(filePath),
          });
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyMaplibreWorkerPlugin()],
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

