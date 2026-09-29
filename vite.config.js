import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'pwa-64x64.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png'],
      manifest: {
        name: 'Zubaida Diagnostics',
        short_name: 'ZD',
        description: 'Patient management system for The Clinic and Zubaida Diagnostic',
        theme_color: '#2563eb',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Prevent the service worker from intercepting API/document/socket routes
        navigateFallbackDenylist: [/^\/api\//, /^\/document\//, /^\/socket\.io\//],
        // Use NetworkOnly strategy for all requests so nothing is cached
        runtimeCaching: [
          {
            urlPattern: () => true,
            handler: 'NetworkOnly',
          }
        ],
        // Don't precache any assets
        globPatterns: [],
        // Skip waiting and claim clients immediately for instant updates
        skipWaiting: true,
        clientsClaim: true,
        // Disable navigation preload which can cause stale responses
        navigationPreload: false,
      }
    })
  ],
  server: {
    allowedHosts: ["rummage-reprint-unclog.ngrok-free.dev"],
    proxy: {
      '/api': 'http://localhost:3000',
      '/document': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
})
