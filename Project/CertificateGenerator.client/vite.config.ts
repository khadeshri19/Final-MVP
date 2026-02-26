import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
      "/generated": {
        target: "http://localhost:5050",
        changeOrigin: true,
      },
    },
  },
});
