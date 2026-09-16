import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { TEST_SERVER_URL } from './src/test/setup/testServerConfig.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globalSetup: ['./src/test/setup/globalSetup.js'],
    env: {
      VITE_API_BASE_URL: TEST_SERVER_URL,
    },
  },
})
