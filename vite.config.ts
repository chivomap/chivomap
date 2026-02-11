import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'maplibre': ['maplibre-gl'],
          'react-vendor': ['react', 'react-dom'],
          'utils': ['zustand', 'fuse.js'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    minify: 'esbuild',
  },
})
