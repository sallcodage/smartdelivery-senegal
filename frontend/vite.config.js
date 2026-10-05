import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // En développement, /api est redirigé vers le backend Express (pas de souci CORS)
    proxy: { '/api': 'http://localhost:4000' },
  },
  preview: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    css: false,
  },
});
