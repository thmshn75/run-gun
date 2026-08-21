import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/run-gun/',
  build: {
    sourcemap: false,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Run & Gun',
        short_name: 'Run & Gun',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/run-gun/',
        scope: '/run-gun/',
        theme_color: '#10131d',
        background_color: '#10131d',
        icons: [
          { src: '/run-gun/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/run-gun/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
      },
    }),
  ],
})
