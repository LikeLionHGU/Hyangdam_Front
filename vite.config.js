import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 컬러 변환 백엔드 (npm run server)
      '/api': 'http://localhost:3000',
    },
  },
})
