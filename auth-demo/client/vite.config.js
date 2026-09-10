import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/signup': 'http://localhost:3000',
      '/login': 'http://localhost:3000',
      '/todos': 'http://localhost:3000'
    }
  }
});