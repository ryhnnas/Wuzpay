import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './',
  build: {
    chunkSizeWarningLimit: 1600,
  },
  // --- TAMBAHKAN BAGIAN INI ---
  server: {
    proxy: {
      '/api': {
        target: 'https://api-nexera.ryhnnas.my.id',
        changeOrigin: true,
        secure: true, // Karena sudah pakai HTTPS asli
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
