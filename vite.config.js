import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/RSPG-School-Garden/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500
  }
})
