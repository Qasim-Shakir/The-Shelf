import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: true,
    headers: {
      'Content-Security-Policy': "default-src * 'unsafe-inline' 'unsafe-eval' blob: data:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'unsafe-inline'; img-src * blob: data:; font-src *; connect-src * ws: wss:; worker-src blob:;"
    }
  },
});