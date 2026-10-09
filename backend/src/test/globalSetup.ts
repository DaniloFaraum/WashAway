import 'dotenv/config'
import { exec, execSync } from 'node:child_process'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { PrismaClient } from '@prisma/client'
import type { TestProject } from 'vitest/node'
import {
  NOME_BANCO_TESTE_BASE,
  TEST_DATABASE_URL,
  URL_BANCO_MANUTENCAO,
  nomeBancoDoWorker,
  urlBancoDoWorker,
} from './testDatabaseUrl.js'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BACKEND_ROOT = path.resolve(__dirname, '../..')

// Um banco por worker do Vitest (washaway_test_1..N, N = maxWorkers). Cada
// worker aponta o DATABASE_URL pro seu banco em `setupBancoDoWorker.ts`.
// Nada é apagado aqui: o banco é criado se não existir e recebe as migrations
// pendentes. Os dados de cada teste vêm das factories (valores únicos) e são
// removidos pelo próprio arquivo (`helpers/limpeza.ts`).
export default async function setup(project: TestProject) {
  // No CI o Postgres é um `services:` do job, não o docker-compose local.
  if (!process.env.CI) {
    execSync('docker compose up -d --wait', { cwd: BACKEND_ROOT, stdio: 'inherit' })
  }

  // Sem `maxWorkers` explícito o Vitest usa CPUs - 1 (CPUs / 2 no watch), e o
  // VITEST_POOL_ID nunca passa disso.
  const workers =
    project.globalConfig.maxWorkers ?? project.config.maxWorkers ?? Math.max(availableParallelism() - 1, 1)
  // O banco base (washaway_test) também é mantido migrado: os testes do Vitest
  // não o usam, mas o teste do worker de e-mail (scripts/test_email_worker.py) sim.
  const bancos = [
    { nome: NOME_BANCO_TESTE_BASE, url: TEST_DATABASE_URL },
    ...Array.from({ length: workers }, (_, index) => ({
      nome: nomeBancoDoWorker(index + 1),
      url: urlBancoDoWorker(index + 1),
    })),
  ]

  const admin = new PrismaClient({ datasourceUrl: URL_BANCO_MANUTENCAO })
  try {
    const existentes = await admin.$queryRaw<{ datname: string }[]>`SELECT datname FROM pg_database`
    const nomes = new Set(existentes.map((row) => row.datname))
    for (const { nome } of bancos) {
      if (!nomes.has(nome)) {
        try {
          await admin.$executeRawUnsafe(`CREATE DATABASE "${nome.replaceAll('"', '""')}"`)
        } catch (error) {
          // Outra execução em paralelo pode ter criado o mesmo banco agora.
          if (!String(error).includes('already exists')) throw error
        }
      }
    }
  } finally {
    await admin.$disconnect()
  }

  await Promise.all(
    bancos.map(async ({ nome, url }) => {
      try {
        await execAsync('npx prisma migrate deploy', {
          cwd: BACKEND_ROOT,
          env: { ...process.env, DATABASE_URL: url },
        })
      } catch (error) {
        const { stdout, stderr } = error as { stdout?: string; stderr?: string }
        console.error(`Falha ao migrar ${nome}:\n${stdout ?? ''}${stderr ?? ''}`)
        throw error
      }
    }),
  )
  console.log(`Bancos de teste prontos: ${bancos.map(({ nome }) => nome).join(', ')}`)
}
