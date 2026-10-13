import { defineConfig } from 'vite';

export default defineConfig({
  // the app is served through a proxied preview host, so accept any Host header
  server: { host: true, allowedHosts: true, port: 5173, strictPort: false },
  preview: { host: true, allowedHosts: true },
  build: { chunkSizeWarningLimit: 1200 },
});
