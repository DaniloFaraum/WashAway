// setupFiles do projeto de integração: roda no worker antes de cada arquivo de
// teste (e antes de `config/prisma.ts` ser importado), apontando o Prisma pro
// banco deste worker. VITEST_POOL_ID vai de 1 a maxWorkers.
import { urlBancoDoWorker } from './testDatabaseUrl.js'

process.env.DATABASE_URL = urlBancoDoWorker(process.env.VITEST_POOL_ID ?? '1')
