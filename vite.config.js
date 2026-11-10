import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173 },
  build: {
    target: 'es2022',
    // Three.js ocupa ~650 KB minificado; es un único paquete esperado, no un error.
    chunkSizeWarningLimit: 1200,
  },
});
