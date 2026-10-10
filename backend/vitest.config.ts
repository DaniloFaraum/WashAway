import 'dotenv/config'
import { defineConfig } from 'vitest/config'

// Dois projetos (ver "Testes" em .specs/backend.specs.md):
// - unit: `src/**/*.unit.test.ts`, regras puras, sem Docker/banco (`npm run test:unit`);
// - integracao: `src/test/**/*.test.ts`, HTTP via supertest contra o Postgres de
//   teste, um banco por worker (`npm run test` roda os dois).
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Segredo fixo só de teste (o de dev/produção vem do .env): os testes assinam
    // tokens com `assinarToken` e conferem 401 com outro segredo/expirado.
    // Limite de tentativas alto nos testes, pra não interferir nos logins/cadastros
    // de cada arquivo; o teste do limite cria o app com um limite baixo
    // (`createApp({ limiteTentativas })`, src/test/limiteTentativas.test.ts).
    env: {
      JWT_SECRET: 'segredo-fixo-so-para-testes-com-32-caracteres-ou-mais',
      JWT_EXPIRES_IN: '7d',
      LIMITE_TENTATIVAS: '10000',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'src/**/*.unit.test.ts', 'src/server.ts'],
      reporter: ['text-summary', 'html', 'lcov'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.unit.test.ts'],
          // Teste unitário não deve tocar no banco. Se tocar por engano, falha
          // em vez de cair no banco de dev carregado pelo .env.
          env: { DATABASE_URL: 'postgresql://sem-banco-em-teste-unitario@localhost:1/nenhum' },
        },
      },
      {
        extends: true,
        test: {
          name: 'integracao',
          include: ['src/test/**/*.test.ts'],
          // `*.unit.test.ts` é do projeto unit, mesmo se ficar em src/test/.
          exclude: ['**/node_modules/**', '**/dist/**', '**/*.unit.test.ts'],
          globalSetup: ['./src/test/globalSetup.ts'],
          setupFiles: ['./src/test/setupBancoDoWorker.ts'],
        },
      },
    ],
  },
})
