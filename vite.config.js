import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/docsice/', // reemplazar por tu nombre de repo en GitHub
})
