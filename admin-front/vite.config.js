import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globalSetup: ['./src/test/setup/globalSetup.js'],
    env: {
      VITE_API_BASE_URL: 'http://localhost:3002',
    },
  },
})
