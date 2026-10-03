import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { TEST_SERVER_URL } from './src/test/setup/testServerConfig'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globalSetup: ['./src/test/setup/globalSetup.ts'],
    env: {
      EXPO_PUBLIC_API_BASE_URL: TEST_SERVER_URL,
    },
  },
})
