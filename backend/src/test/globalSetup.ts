import 'dotenv/config'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEST_DATABASE_URL } from './testDatabaseUrl.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = path.resolve(__dirname, '../..')

export default async function setup() {
  execSync('docker compose up -d --wait', { cwd: BACKEND_ROOT, stdio: 'inherit' })
  execSync('npx prisma migrate deploy', {
    cwd: BACKEND_ROOT,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  })
}
