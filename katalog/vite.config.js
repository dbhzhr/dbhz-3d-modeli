import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // three.js je ~600 KB, jedini veliki chunk — upozorenje nije korisno
    chunkSizeWarningLimit: 900,
  },
});
