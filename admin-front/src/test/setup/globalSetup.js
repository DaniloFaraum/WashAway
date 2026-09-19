import { spawn } from 'node:child_process'
import { copyFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEST_SERVER_PORT } from './testServerConfig.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_SRC = path.resolve(__dirname, '../fixtures/pedidos.db.json')
const FIXTURE_TMP = path.resolve(__dirname, '../fixtures/.tmp-pedidos.db.json')
const JSON_SERVER_BIN = path.resolve(__dirname, '../../../node_modules/.bin/json-server')
const PORT = TEST_SERVER_PORT

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // json-server ainda subindo, tenta de novo
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`json-server de teste não respondeu em ${url} a tempo`)
}

export default async function setup() {
  await copyFile(FIXTURE_SRC, FIXTURE_TMP)

  const child = spawn(JSON_SERVER_BIN, ['--port', String(PORT), FIXTURE_TMP], {
    stdio: 'ignore',
  })

  try {
    await waitForServer(`http://localhost:${PORT}/pedidos`)
  } catch (err) {
    child.kill()
    throw err
  }

  return async () => {
    child.kill()
    await rm(FIXTURE_TMP, { force: true })
  }
}
