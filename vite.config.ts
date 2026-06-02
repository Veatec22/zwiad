import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [tailwindcss(), react(), svgr()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
