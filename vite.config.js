import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 같은 와이파이의 휴대폰에서 접속 가능하도록 LAN에 개방
    proxy: {
      // 컬러 변환 백엔드 (npm run server)
      '/api': 'http://localhost:3000',
      '/outputs': 'http://localhost:3000', // 생성된 영상
      '/shares': 'http://localhost:3000', // 공유 이미지
      '/share': 'http://localhost:3000', // 공유 페이지
    },
  },
})
