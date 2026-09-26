# backend — Spec

> Documento de referência técnica do `backend`. Este spec descreve o **MVP implementado** (`docs/plan/backend-mvp/backend-mvp.md`) — não é mais só proposta. O domínio completo imaginado inicialmente (`Usuario`, `Servico`, `Veiculo`, auth) continua registrado na seção 7 como próximos passos, fora do que existe hoje.

## 1. Visão geral

`backend` é a API real que `admin-front` (dono do lava-rápido) e `app_mobile` (consumidor) consomem por padrão. Antes desta task, os dois front-ends simulavam esse back-end cada um com seu próprio `json-server` local, com dados que nunca se cruzavam. Agora os dois apontam pro mesmo Postgres, e um `Pedido` sempre referencia um `LavaRapido` real (`lavaRapidoId`).

- **Escopo do MVP**: só as entidades e rotas necessárias para o gatilho que motivou a task — o onboarding do app_mobile (escolha de lava-rápido) e o painel de pedidos do admin-front passarem a usar a mesma fonte de dados.
- Os `json-server` de cada front **continuam existindo** como fallback manual (não foram removidos) — ver seção 5.

## 2. Stack

- **Node.js** + **Express** (`src/app.ts` monta o app; `src/server.ts` sobe o servidor — separados para o `app` ser importável em testes via Supertest sem abrir porta).
- **Prisma** + **PostgreSQL** — `prisma/schema.prisma` só com `LavaRapido` e `Pedido` (ver seção 4).
- **bcryptjs** — hash da senha do `LavaRapido` (implementação pura JS, sem etapa de compilação nativa — escolha explícita do usuário sobre o `bcrypt` nativo).
- **Docker Compose** (`docker-compose.yml`) — um serviço `postgres:16-alpine`, porta `5433` (host) → `5432` (container), com healthcheck. Mesma instância serve o banco de dev (`washaway`) e o de teste (`washaway_test`, banco separado dentro do mesmo container).
- **Vitest + Supertest** — testes de integração batendo no `app` Express diretamente (sem porta de rede), contra o Postgres real de teste.
- **dotenv** — carrega `.env` (não versionado; `.env.example` documenta as chaves).

## 3. Como rodar

1. `cd backend && npm install`.
2. `npm run docker:up` — sobe o Postgres (`docker compose up -d --wait`).
3. `npx prisma migrate dev` (só a primeira vez, ou quando o schema mudar) — aplica as migrations em `prisma/migrations/` no banco de dev.
4. `npm run prisma:seed` — popula `washaway` com 5 lava-rápidos e 3 pedidos (mesmos dados que já estavam nos dois `db.json` dos front-ends, agora ligados via `lavaRapidoId`).
5. `npm run dev` — sobe o Express em `http://localhost:4000` (`tsx watch src/server.ts`).

## 4. Domínio implementado

```prisma
model LavaRapido {
  id           String   @id @default(cuid())
  name         String
  address      String?
  cnpj         String   @unique
  senha        String
  rating       Float
  reviewsCount Int
  distance     String
  time         String
  price        Float
  isOpen       Boolean
  image        String
  latitude     Float
  longitude    Float
  pedidos      Pedido[]
}

enum PedidoStatus {
  pendente
  em_andamento
  concluido
}

model Pedido {
  id           String       @id @default(cuid())
  lavaRapidoId String
  lavaRapido   LavaRapido   @relation(fields: [lavaRapidoId], references: [id])
  veiculo      Json         # { modelo, placa } — mesma forma que admin-front/pedidos.model.js já usa
  servico      String       # 1 serviço por pedido — ver divergência registrada na seção 7
  horario      DateTime
  status       PedidoStatus @default(pendente)
  fotos        String[]     # URLs estáticas (mock) — upload real não existe (seção 7)
}
```

`LavaRapido` usa o formato de campos do **app_mobile** (`name`, `rating`, `reviewsCount`, `distance`, `time`, `price`, `image`), não o esboço inicial deste spec (`nome`/`endereco`) — decisão tomada na implementação pra bater exatamente com `lavaRapidos.model.ts` sem exigir nenhuma mudança de `model` no front. `distance`/`time` continuam sendo campos estáticos persistidos (copiando o mock), não calculados a partir da localização real do consumidor — mesma limitação que já existia, não resolvida aqui.

`cnpj`/`senha` foram adicionados na task `selecao-empresa-admin-front` (`docs/plan/selecao-empresa-admin-front/`) pra dar ao admin-front um login real por empresa: `cnpj` é único (formato validado só como 14 dígitos numéricos, sem dígito verificador); `senha` é sempre o hash bcrypt de `"admin"` — fixa e proposital (fora de escopo: troca de senha, JWT, expiração de sessão). Nenhuma rota expõe `senha` em resposta (`create`/`login` removem o campo antes de responder).

**Nota sobre a migration `20260926011840_add_login_fields`**: `prisma migrate dev` é interativo (pede confirmação quando detecta perda de dado — os 5 `LavaRapido` seed não tinham `cnpj`/`senha`) e esse ambiente não suporta prompt interativo. A migration foi escrita à mão (`DELETE FROM "Pedido"; DELETE FROM "LavaRapido";` antes de adicionar as colunas `NOT NULL`, seguro pois é só dado de seed/dev) e aplicada com `npx prisma migrate deploy` (não interativo) + `npx prisma generate`, depois repopulada via `npm run prisma:seed`.

## 5. Contrato de API implementado

| Rota | Método | Descrição |
|---|---|---|
| `/lava-rapidos` | `GET` | Lista todos. |
| `/lava-rapidos/:id` | `GET` | Um lava-rápido; `404` se não existir. |
| `/lava-rapidos` | `POST` | Cadastro: body `{ name, address?, cnpj }`; `400` se `cnpj` não tiver 14 dígitos numéricos ou `name` faltar; `409` se `cnpj` já existir; senha fixada como hash de `"admin"` (bcryptjs), demais campos com defaults (`rating`/`reviewsCount`/`price`/`latitude`/`longitude`: `0`, `distance`/`time`: `''`, `isOpen`: `true`, `image`: placeholder). Resposta `201` sem o campo `senha`. |
| `/lava-rapidos/login` | `POST` | Login: body `{ cnpj, senha }`; `401` se `cnpj` não existir ou `senha` não bater (bcrypt compare); `200` com o `LavaRapido` (sem `senha`) se validar. |
| `/pedidos` | `GET` | Lista todos, mais recentes primeiro, com `lavaRapidoId`. Aceita `?lavaRapidoId=` opcional pra filtrar por empresa (usado pelo admin-front após o login). |
| `/pedidos/:id` | `PATCH` | Atualiza **só** o `status` (body `{ status }`); `400` se o status não for um dos 3 válidos, `404` se o pedido não existir. |

**Desvio da decisão original do plano**: o plano previa uma rota específica `PATCH /pedidos/:id/status`. Na implementação, isso quebraria com o `pedidos.routes.js` do admin-front (que já usa `PATCH /pedidos/:id` genérico) e com o `json-server` de fallback (que não suporta sub-rotas customizadas — não tem `--routes`/rewrite nessa versão). Mantida `PATCH /pedidos/:id`, com a mesma segurança pretendida (só `status` é aceito, qualquer outro campo no body é ignorado) garantida na validação do controller, não na URL. Isso preserva o critério "zero mudança de código além da `BASE_URL`" nos dois front-ends.

Nenhuma outra rota do domínio completo (seção 7) foi implementada nesta task — `/servicos`, `/veiculos`, `/auth`, `POST /pedidos` continuam não existindo aqui (as telas `Serviços`/`Disponibilidade`/`Veículos` do admin-front usam seu próprio `json-server`, não este backend — ver `admin-front.specs.md` seção 8).

## 6. Organização de pastas

```
backend/
├── docker-compose.yml
├── .env.example                     # DATABASE_URL, TEST_DATABASE_URL, PORT
├── prisma/
│   ├── schema.prisma
│   ├── migrations/                  # geradas por `prisma migrate dev`
│   └── seed.ts
├── src/
│   ├── app.ts                       # createApp() — monta o Express, sem dar listen
│   ├── server.ts                    # importa createApp() e sobe na porta 4000
│   ├── config/
│   │   └── prisma.ts                # PrismaClient singleton
│   ├── modules/
│   │   ├── lava-rapidos/{lavaRapidos.routes,controller,service}.ts
│   │   └── pedidos/{pedidos.routes,controller,service}.ts
│   └── test/
│       ├── globalSetup.ts           # docker compose up + prisma migrate deploy no banco de teste
│       ├── lavaRapidos.test.ts
│       └── pedidos.test.ts
└── vitest.config.ts                 # aponta DATABASE_URL pro banco de teste; exclui dist/ (ver nota)
```

**Nota**: `vitest.config.ts` exclui explicitamente `dist/**` — sem isso, depois de um `npm run build`, o Vitest também descobre e roda os `.test.js` compilados em `dist/`, duplicando cada teste (achado durante a validação desta task).

## 7. Próximos passos / domínio ainda não implementado

O domínio completo imaginado originalmente continua válido como direção — só não faz parte deste MVP:

```
Usuario
  id, nome, email, papel: 'consumidor' | 'dono_lava_rapido'

Servico                        # hoje só mockado em app_mobile/servicos.tsx e no json-server do admin-front (telas Serviços/Disponibilidade/Veículos)
  id, lavaRapidoId, titulo, descricao, preco, duracaoMinutos, imagem

Veiculo                        # hoje só {modelo, placa} embutido em Pedido.veiculo (Json)
  id, consumidorId, modelo, placa
```

- **Autenticação**: `admin-front` agora tem login real por `LavaRapido` (CNPJ + senha fixa "admin", ver seção 4/5) — mas é proposital e simples: sem JWT, sem expiração de sessão, sem troca/recuperação de senha, sem validação de dígito verificador do CNPJ. Os endpoints continuam sem middleware de auth (qualquer request pode chamar `GET /pedidos`, `GET /lava-rapidos`, etc. — só o `login`/`cadastro` em si têm alguma validação). `app_mobile` continua sem login nenhum.
- **Upload de fotos do veículo**: `Pedido.fotos` continua array de URLs estáticas — sem endpoint de upload nem storage.
- **Divergência `Pedido.servico` (string) vs. seleção múltipla** (`app_mobile/servicos.tsx` deixa marcar vários serviços): não resolvida — `Pedido.servico` no banco continua um `String` só, copiando o que `admin-front/pedidos.model.js` já fazia.
- **`POST /pedidos`**: nenhum front cria pedido pela UI ainda; não implementado.
- **`Servico`/`Veiculo` como entidades do backend**: as telas `Serviços`/`Disponibilidade`/`Veículos` do admin-front (ver `admin-front.specs.md` seção 8) usam o `json-server` do admin-front, não este backend — migrar isso é trabalho futuro.
- **Deploy/hosting em produção**: não definido; só ambiente local via Docker Compose.

## 8. Referências
- `docs/plan/backend-mvp/backend-mvp.md` — plano e decisões desta implementação.
- `docs/logs/backend-mvp.md` — o que foi de fato feito, desvios.
- `docs/plan/selecao-empresa-admin-front/selecao-empresa-admin-front.md` — login real (CNPJ+senha), `cnpj`/`senha`/`address` em `LavaRapido`, filtro `?lavaRapidoId=` em `GET /pedidos`.
- `WashAway/.specs/admin-front.specs.md` — seção 3.1/5, `BACKEND_API_BASE_URL` como padrão agora.
- `WashAway/.specs/app_mobile.specs.md` — seção 4.1, `BACKEND_API_BASE_URL` como padrão agora.
