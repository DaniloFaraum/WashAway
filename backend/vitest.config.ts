import 'dotenv/config'
import { defineConfig } from 'vitest/config'
import { TEST_DATABASE_URL } from './src/test/testDatabaseUrl.js'

export default defineConfig({
  test: {
    globalSetup: ['./src/test/globalSetup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
})
