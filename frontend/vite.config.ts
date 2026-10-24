import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    // Docker Desktop on Windows/OneDrive may not forward file-system events.
    // Polling keeps edits to mounted source files visible to Vite.
    watch: {
      usePolling: true,
      interval: 750,
    },
  },
});
