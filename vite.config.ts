import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      // El service worker solo guarda la app (shell y estáticos): las llamadas
      // a Supabase van siempre en vivo y no se cachean.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: ['**/og.png'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'csspoll',
        short_name: 'csspoll',
        description: 'Encuestas para tu grupo: varios horarios, plazas limitadas y sin registros.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0e7c42',
        background_color: '#f5f7f5',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
