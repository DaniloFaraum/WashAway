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
    // Só relatório (npm run test:coverage), sem limite mínimo que bloqueie PR.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.*'],
      reporter: ['text-summary', 'html', 'lcov'],
    },
    env: {
      EXPO_PUBLIC_API_BASE_URL: TEST_SERVER_URL,
    },
  },
})
