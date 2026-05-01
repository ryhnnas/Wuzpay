import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['logo.png', 'W.png', 'qris-gopay.jpg'],
      manifestFilename: 'manifest.webmanifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      devOptions: {
        enabled: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  base: '/',
  build: {
    chunkSizeWarningLimit: 1600,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Sesuaikan dengan PORT di .env backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
