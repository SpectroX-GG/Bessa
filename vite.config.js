import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'Bessa Refrigeração',
        short_name: 'Bessa',
        description: 'Agenda e checklist de instalações',
        theme_color: '#102538',
        background_color: '#f3f6f9',
        display: 'standalone',
        start_url: '/',
        icons: []
      }
    })
  ]
})
