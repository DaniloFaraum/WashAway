// URL "base" dos bancos de teste. Não é usada direto pelos testes: cada worker
// do Vitest usa o próprio banco, `<base>_<VITEST_POOL_ID>` (washaway_test_1..N),
// criado e migrado pelo globalSetup. Assim arquivos rodando em paralelo não
// enxergam os dados uns dos outros.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://washaway:washaway@localhost:5433/washaway_test'

function comBanco(url: string, banco: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${banco}`
  return parsed.toString()
}

export const NOME_BANCO_TESTE_BASE = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, '')

/** Banco de manutenção do Postgres, usado só pra CREATE DATABASE. */
export const URL_BANCO_MANUTENCAO = comBanco(TEST_DATABASE_URL, 'postgres')

export function nomeBancoDoWorker(poolId: number | string): string {
  return `${NOME_BANCO_TESTE_BASE}_${poolId}`
}

export function urlBancoDoWorker(poolId: number | string): string {
  return comBanco(TEST_DATABASE_URL, nomeBancoDoWorker(poolId))
}
