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
- **Docker Compose** (`docker-compose.yml`) — serviço `postgres:16-alpine`, porta `5433` (host) → `5432` (container), com healthcheck. Mesma instância serve o banco de dev (`washaway`) e o de teste (`washaway_test`, banco separado dentro do mesmo container). Serviço `pgadmin` (`dpage/pgadmin4`, porta `5050` → `80`) — UI web pra inspecionar o Postgres, útil em dev (WSL2 expõe a porta pro Windows automaticamente, sem config extra); login em `postgres@postgres.com` / `postgres` (`PGADMIN_DEFAULT_EMAIL`/`PGADMIN_DEFAULT_PASSWORD` — só o login do pgAdmin, **não** credencial do banco, que continua `washaway`/`washaway`); `pgadmin/servers.json` já cadastra o servidor Postgres (host `postgres`, porta `5432`, usuário `washaway`) na primeira conexão dentro do pgAdmin — a senha (`washaway`) precisa ser digitada manualmente na primeira vez, pgAdmin não a pré-preenche por segurança.
- **Vitest + Supertest** — testes de integração batendo no `app` Express diretamente (sem porta de rede), contra o Postgres real de teste.
- **dotenv** — carrega `.env` (não versionado; `.env.example` documenta as chaves).

## 3. Como rodar

1. `cd backend && npm install`.
2. `npm run docker:up` — sobe o Postgres (`docker compose up -d --wait`).
3. `npx prisma migrate dev` (só a primeira vez, ou quando o schema mudar) — aplica as migrations em `prisma/migrations/` no banco de dev.
4. `npm run prisma:seed` — popula `washaway` com 5 lava-rápidos (cada um com `address` preenchido — mesma rua/bairro/cidade/CEP, número diferente por lava-rápido — pra o consumidor sempre ter um endereço pra ver no app_mobile), 3 pedidos, o catálogo global de 18 itens de serviço, e 3 serviços (combos de itens do catálogo) + 2 intercorrências por lava-rápido (mesmos dados que já estavam nos `db.json` dos front-ends, agora ligados via `lavaRapidoId`).
   - **Atenção: o seed é destrutivo** — começa com `deleteMany()` em todas as tabelas (apaga empresas cadastradas pela UI). Para dados de apresentação use `npm run prisma:demo` (`prisma/demo.ts`): só insere, pula empresas cujo CNPJ já existe, nunca apaga. Cria 6 empresas em SP com serviços (combos), pedidos de hoje/ontem/amanhã em vários status, intercorrências (feriados, uma parcial e uma empresa fechada hoje) e uma solicitação de onboarding pendente (CNPJ `72645819000163`). Requer o catálogo e o contrato do seed já no banco.
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

model Servico {              # serviço da loja = combo de itens do catálogo
  id           String     @id @default(cuid())
  lavaRapidoId String
  lavaRapido   LavaRapido @relation(fields: [lavaRapidoId], references: [id])
  nome         String     # nome comercial livre (ex.: "Lavagem completa")
  preco        Float      # preço total do combo (item não tem preço)
  ativo        Boolean    @default(true)
  itens        ServicoItem[]   # categorias do serviço são derivadas dos itens
}

model ItemServico {          # catálogo global, mantido só via seed/banco
  id        String  @id @default(cuid())
  nome      String  @unique
  descricao String
  categoria String
  ativo     Boolean @default(true)   # aposentar item sem apagar
}

model ServicoItem {          # N:N Servico ↔ ItemServico, @@id([servicoId, itemId])
  servicoId String           # onDelete: Cascade
  itemId    String
}

model Intercorrencia {
  id           String     @id @default(cuid())
  lavaRapidoId String
  lavaRapido   LavaRapido @relation(fields: [lavaRapidoId], references: [id])
  data         String     # "YYYY-MM-DD" — ver nota abaixo, não é DateTime de propósito
  motivo       String
  diaInteiro   Boolean    @default(true)
  horaInicio   String?
  horaFim      String?
  reaberta     Boolean    @default(false)  # ver nota sobre isOpen calculado, seção 5
}
```

`Servico` e `Intercorrencia` foram adicionados na task `migrar-servicos-disponibilidade-veiculos-backend` (`docs/plan/migrar-servicos-disponibilidade-veiculos-backend/`) pra tirar essas 3 telas do `json-server` isolado do admin-front.

**Catálogo × combo** (`docs/plan/servicos-combos-catalogo/`): a loja não declara em texto livre o que faz — ela monta seus `Servico`s (combos) escolhendo 1+ `ItemServico` de um catálogo global (lavagem externa, aspiração, secagem, polimento…, 18 itens em 4 categorias no seed). Não existe rota pra criar item; o catálogo só muda via seed/banco. O campo livre `Servico.categoria` foi removido (migration `20261003020000_servicos_combos_catalogo`, que também apaga os `Servico` antigos — só dado de seed); a API devolve `categorias` derivadas dos itens. **Duração** (`docs/plan/tempo-estimado-preco-servicos/`): cada `ItemServico` tem `duracaoMinutos` (migration `20261003030000_duracao_item_servico`, valores no seed); a duração do combo é **derivada** na resposta (soma dos itens), sem coluna própria. `Veiculo` **não ganhou tabela própria** — `GET /veiculos` deriva a lista a partir de `Pedido.veiculo` (ver seção 5).

**Desvio do plano — `Intercorrencia.data` é `String`, não `DateTime`**: o plano original especificava `DateTime`, mas `admin-front/src/pages/disponibilidade/Disponibilidade.jsx` casa esse campo por igualdade exata de string no formato `"YYYY-MM-DD"` (marcação de dias no calendário via `dayjs().format('YYYY-MM-DD')`). Um `DateTime` serializaria como ISO completo (`"2026-10-12T00:00:00.000Z"`) e quebraria silenciosamente esse match — nenhum dia apareceria marcado no calendário. `String` guarda exatamente o formato que o front já espera, sem semântica de data no servidor (não há nenhuma ordenação/cálculo por data feito no backend que justificasse `DateTime`).

`LavaRapido` usa o formato de campos do **app_mobile** (`name`, `rating`, `reviewsCount`, `distance`, `time`, `price`, `image`), não o esboço inicial deste spec (`nome`/`endereco`) — decisão tomada na implementação pra bater exatamente com `lavaRapidos.model.ts` sem exigir nenhuma mudança de `model` no front. **`price` é calculado** (`tempo-estimado-preco-servicos`): `GET /lavaRapidos` e `GET /lavaRapidos/:id` devolvem `price` = menor `preco` entre os `Servico`s **ativos** da loja (um `groupBy` só para a lista), ou `null` sem serviço ativo — a coluna `LavaRapido.price` continua no banco mas não é mais o valor exibido. `distance`/`time` continuam sendo campos estáticos persistidos (copiando o mock), não calculados a partir da localização real do consumidor — mesma limitação que já existia, não resolvida aqui.

`cnpj`/`senha` foram adicionados na task `selecao-empresa-admin-front` (`docs/plan/selecao-empresa-admin-front/`) pra dar ao admin-front um login real por empresa: `cnpj` é único (formato validado só como 14 dígitos numéricos, sem dígito verificador); `senha` é sempre o hash bcrypt de `"admin"` — fixa e proposital (fora de escopo: troca de senha, JWT, expiração de sessão). Nenhuma rota expõe `senha` em resposta (`create`/`login` removem o campo antes de responder).

**`isOpen` é calculado, não é o valor cru da coluna** (task `isopen-intercorrencia-backend`, `docs/plan/isopen-intercorrencia-backend/`): a coluna `LavaRapido.isOpen` continua existindo (fixada `true` no cadastro/seed, nunca escrita depois), mas `GET /lava-rapidos` e `GET /lava-rapidos/:id` retornam `isOpen: false` sempre que houver uma `Intercorrencia` "ativa agora" pra aquele lava-rápido — de dia inteiro (`diaInteiro: true`) na data de hoje, ou parcial (`diaInteiro: false`) com o horário atual do servidor dentro de `horaInicio`–`horaFim`. Intercorrências marcadas `reaberta: true` não contam mais (ver `PATCH /intercorrencias/:id`, seção 5) — é como o dono reverte manualmente um fechamento automático (ex.: intercorrência cadastrada por engano, ou que terminou antes do previsto). `GET /lava-rapidos/:id` (mas não a listagem, pra não pesar) também retorna `intercorrenciaAtiva: {...} | null` com a intercorrência que está causando o fechamento agora, se houver. Cálculo feito na leitura (sem cron/job), sem tratamento de fuso horário (assume o fuso do servidor, mesma premissa já usada pras strings `data`/`horaInicio`/`horaFim`).

**Onboarding com contrato** (task `onboarding-contrato-empresa`, `docs/plan/onboarding-contrato-empresa/`, migration `20261003010000_onboarding_contrato`): dois models novos, separados de `LavaRapido` de propósito ("BackEnd Onboard" × "BackEnd Aplicação", como módulos do mesmo Express/banco):

```prisma
model Contrato {                 # repositório de contratos — versionado, um vigente por vez
  id, versao Int @unique, titulo, conteudo, vigente Boolean, criadoEm
}

enum SolicitacaoStatus { aguardando_contrato  concluida }

model SolicitacaoOnboarding {
  id, name, address?, cnpj, status SolicitacaoStatus,
  contratoId -> Contrato,        # versão que a empresa vai aceitar/aceitou
  aceitoEm DateTime?, lavaRapidoId String? @unique, criadoEm
}
```

Uma empresa só vira `LavaRapido` (e só aparece em `GET /lavaRapidos`/app_mobile, e só consegue logar) **depois de aceitar o contrato** — por isso nenhum endpoint da aplicação precisa filtrar "pendentes". A validação da empresa é **só duplicidade de CNPJ** com **aprovação automática** (a solicitação já nasce `aguardando_contrato`); o aceite é o texto mock `"eu aceito"`. O seed insere o contrato mock (`versao: 1`, `vigente: true`); trocar o texto = nova versão via banco/seed (sem UI).

**Nota sobre a migration `20260926011840_add_login_fields`**: `prisma migrate dev` é interativo (pede confirmação quando detecta perda de dado — os 5 `LavaRapido` seed não tinham `cnpj`/`senha`) e esse ambiente não suporta prompt interativo. A migration foi escrita à mão (`DELETE FROM "Pedido"; DELETE FROM "LavaRapido";` antes de adicionar as colunas `NOT NULL`, seguro pois é só dado de seed/dev) e aplicada com `npx prisma migrate deploy` (não interativo) + `npx prisma generate`, depois repopulada via `npm run prisma:seed`.

## 5. Contrato de API implementado

**Documentação interativa** (`docs/plan/swagger-backend/`): `GET /api-docs` serve a UI do Swagger (`swagger-ui-express`) com todas as rotas abaixo; `GET /api-docs.json` devolve o documento OpenAPI 3.0 cru (útil pra importar em Postman/Insomnia). Documento escrito à mão em `backend/src/docs/openapi.ts` (objeto TS, não gerado via `swagger-jsdoc`/comentários) — precisa ser atualizado manualmente quando uma rota muda; não há teste que garanta que o spec bate com o comportamento real além do smoke test de que os endpoints respondem.

| Rota | Método | Descrição |
|---|---|---|
| `/lava-rapidos` | `GET` | Lista todos. `isOpen` é calculado (ver nota acima); não inclui `intercorrenciaAtiva` (só o detalhe). |
| `/lava-rapidos/:id` | `GET` | Um lava-rápido; `404` se não existir. `isOpen` é calculado (ver nota acima); inclui `intercorrenciaAtiva` (`{...} \| null`). |
| `/lava-rapidos` | `POST` | Cadastro: body `{ name, address?, cnpj }`; `400` se `cnpj` não tiver 14 dígitos numéricos ou `name` faltar; `409` se `cnpj` já existir; senha fixada como hash de `"admin"` (bcryptjs), demais campos com defaults (`rating`/`reviewsCount`/`price`/`latitude`/`longitude`: `0`, `distance`/`time`: `''`, `isOpen`: `true`, `image`: placeholder). Resposta `201` sem o campo `senha`. |
| `/lava-rapidos/login` | `POST` | Login: body `{ cnpj, senha }`; `401` se `cnpj` não existir ou `senha` não bater (bcrypt compare); `200` com o `LavaRapido` (sem `senha`) se validar. |
| `/lava-rapidos/:id` | `DELETE` | Exclui o lava-rápido **em cascata** (`onDelete: Cascade` em `Pedido`/`Servico`/`Intercorrencia`, migration `20260926040000_lavarapido_delete_cascade`) — apaga junto seus pedidos, serviços e intercorrências. `204` se excluído, `404` se não existir. |
| `/pedidos` | `GET` | Lista todos, mais recentes primeiro, com `lavaRapidoId`. Aceita `?lavaRapidoId=` opcional pra filtrar por empresa (usado pelo admin-front após o login). |
| `/pedidos/:id` | `PATCH` | Atualiza **só** o `status` (body `{ status }`); `400` se o status não for um dos 3 válidos, `404` se o pedido não existir. |
| `/servicos` | `GET` | Lista serviços (combos). Aceita `?lavaRapidoId=` opcional. Cada um vem com `itens: [{ id, nome, categoria, duracaoMinutos }]`, `categorias: string[]` (distintas, derivadas dos itens) e `duracaoMinutos` (soma dos itens). |
| `/servicos` | `POST` | Cria um combo: body `{ lavaRapidoId, nome, preco, itemIds }`. `400` se `nome` vazio/maior que 60, `preco` ≤ 0, `itemIds` vazio/com repetição, ou algum item inexistente/inativo no catálogo (resposta traz `itemIdsInvalidos`); `404` se o lava-rápido não existir. `201` com o serviço (já com `itens`/`categorias`). |
| `/servicos/:id` | `PUT` | Edita nome, preço e itens (body `{ nome, preco, itemIds }`, mesma validação do `POST`); substitui os itens numa transação. `404` se o serviço não existir. Sem `DELETE`: a loja desativa (pedidos antigos guardam o nome). |
| `/servicos/:id` | `PATCH` | Atualiza **só** o `ativo` (body `{ ativo: boolean }`, nenhum outro campo); `400` se o body tiver outra coisa, `404` se o serviço não existir. |
| `/itensServico` | `GET` | Catálogo global: itens `ativo: true` (com `duracaoMinutos`), ordenados por categoria e nome. Só leitura — não há rota pra criar/editar item. |
| `/intercorrencias` | `GET` | Lista intercorrências. Aceita `?lavaRapidoId=` opcional. |
| `/intercorrencias` | `POST` | Cria uma intercorrência: body `{ lavaRapidoId, data, motivo, diaInteiro, horaInicio?, horaFim? }`; `400` se `horaInicio`/`horaFim` vierem com `diaInteiro: true`, ou faltarem com `diaInteiro: false`. |
| `/intercorrencias/:id` | `PATCH` | "Reabre" manualmente: body **só** `{ reaberta: true }` (`400` se vier outra coisa); a partir daí essa intercorrência para de contar no cálculo de `isOpen` (ver nota acima). `404` se o id não existir. |
| `/veiculos` | `GET` | Lista veículos **derivados** dos `Pedido`s (não é uma tabela própria — ver seção 4): extrai `veiculo` (JSON) de cada pedido filtrado por `?lavaRapidoId=` (opcional) e deduplica por `placa` (usada como `id` na resposta). |
| `/contratos/vigente` | `GET` | Contrato vigente do onboarding (maior `versao` com `vigente: true`); `404` se não houver. |
| `/onboarding/solicitacoes` | `POST` | Body `{ name, address?, cnpj }`. `400` se `name` faltar/`cnpj` não tiver 14 dígitos; `409` se o `cnpj` já for um `LavaRapido`; `200` devolvendo a solicitação existente se já houver uma `aguardando_contrato` com o mesmo `cnpj` (retomar); `503` se não houver contrato vigente; senão `201` com a solicitação (`status: aguardando_contrato`) + `contrato: { id, versao, titulo, conteudo }`. |
| `/onboarding/solicitacoes/:id` | `GET` | Status + contrato da solicitação; `404` se não existir. |
| `/onboarding/solicitacoes/:id/aceite` | `POST` | Body `{ aceite: "eu aceito" }` (trim, case-insensitive; senão `400`). Numa transação: cria o `LavaRapido` (mesma `criarLavaRapido` do `POST /lavaRapidos`, senha `admin`) e marca a solicitação `concluida` + `aceitoEm` + `lavaRapidoId`. `201` com o `LavaRapido` (sem `senha`); `404` se não existir; `409` se já concluída (ou se o CNPJ foi cadastrado por outro caminho nesse meio-tempo). |

**`POST /lavaRapidos` é legado/interno** desde `onboarding-contrato-empresa`: continua funcionando (seed, testes, uso administrativo), mas o admin-front cadastra empresas só pelo fluxo `/onboarding`.

**Desvio da decisão original do plano**: o plano previa uma rota específica `PATCH /pedidos/:id/status`. Na implementação, isso quebraria com o `pedidos.routes.js` do admin-front (que já usa `PATCH /pedidos/:id` genérico) e com o `json-server` de fallback (que não suporta sub-rotas customizadas — não tem `--routes`/rewrite nessa versão). Mantida `PATCH /pedidos/:id`, com a mesma segurança pretendida (só `status` é aceito, qualquer outro campo no body é ignorado) garantida na validação do controller, não na URL. Isso preserva o critério "zero mudança de código além da `BASE_URL`" nos dois front-ends.

As 3 telas `Serviços`/`Disponibilidade`/`Veículos` do admin-front usam este backend real desde `migrar-servicos-disponibilidade-veiculos-backend` (ver `admin-front.specs.md` seção 8) — o `json-server` próprio delas continua existindo só como fallback manual, mesmo padrão já adotado pra `/pedidos`. `/auth` e `POST /pedidos` continuam não implementados.

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
│   ├── docs/
│   │   └── openapi.ts                # documento OpenAPI 3.0 (objeto TS, escrito à mão) servido em /api-docs
│   ├── modules/
│   │   ├── lava-rapidos/{lavaRapidos.routes,controller,service}.ts
│   │   ├── contratos/{contratos.routes,controller,service}.ts       # "BackEnd Onboard": contrato vigente
│   │   ├── onboarding/{onboarding.routes,controller,service,validation}.ts  # solicitação → aceite → cria LavaRapido
│   │   ├── pedidos/{pedidos.routes,controller,service}.ts
│   │   ├── servicos/{servicos.routes,controller,service,validation}.ts
│   │   ├── itens-servico/{itensServico.routes,controller,service}.ts   # catálogo global, só leitura
│   │   ├── intercorrencias/{intercorrencias.routes,controller,service,validation}.ts
│   │   └── veiculos/{veiculos.routes,controller,service}.ts   # sem model Prisma próprio — deriva de Pedido
│   ├── utils/
│   │   └── queryParam.ts            # getStringQueryParam — normaliza ?lavaRapidoId= (string ou array), usado por todos os módulos acima
│   └── test/
│       ├── globalSetup.ts           # docker compose up + prisma migrate deploy no banco de teste
│       ├── lavaRapidos.test.ts
│       ├── pedidos.test.ts
│       ├── servicos.test.ts
│       ├── itensServico.test.ts
│       ├── intercorrencias.test.ts
│       ├── veiculos.test.ts
│       ├── contratos.test.ts
│       ├── onboarding.test.ts
│       └── openApiDocs.test.ts      # smoke test: /api-docs (HTML) e /api-docs.json (OpenAPI cru) respondem
└── vitest.config.ts                 # aponta DATABASE_URL pro banco de teste; exclui dist/ (ver nota)
```

**Nota**: `vitest.config.ts` exclui explicitamente `dist/**` — sem isso, depois de um `npm run build`, o Vitest também descobre e roda os `.test.js` compilados em `dist/`, duplicando cada teste (achado durante a validação desta task).

## 7. Próximos passos / domínio ainda não implementado

O domínio completo imaginado originalmente continua válido como direção — só não faz parte deste MVP:

```
Usuario
  id, nome, email, papel: 'consumidor' | 'dono_lava_rapido'
```

`Servico` e `Veiculo` (que apareciam aqui antes) já existem — `Servico` como model Prisma real, `Veiculo` derivado de `Pedido.veiculo` (ver seção 4/5).

- **Autenticação**: `admin-front` agora tem login real por `LavaRapido` (CNPJ + senha fixa "admin", ver seção 4/5) — mas é proposital e simples: sem JWT, sem expiração de sessão, sem troca/recuperação de senha, sem validação de dígito verificador do CNPJ. Os endpoints continuam sem middleware de auth (qualquer request pode chamar `GET /pedidos`, `GET /lava-rapidos`, etc. — só o `login`/`cadastro` em si têm alguma validação). `app_mobile` continua sem login nenhum.
- **Upload de fotos do veículo**: `Pedido.fotos` continua array de URLs estáticas — sem endpoint de upload nem storage.
- **Divergência `Pedido.servico` (string) vs. seleção múltipla** (`app_mobile/servicos.tsx` deixa marcar vários serviços): não resolvida — `Pedido.servico` no banco continua um `String` só, copiando o que `admin-front/pedidos.model.js` já fazia.
- **`POST /pedidos`**: nenhum front cria pedido pela UI ainda; não implementado.
- **Excluir `Servico` / editar ou excluir `Intercorrencia`**: fora de escopo — serviço pode ser criado/editado/ativado (`servicos-combos-catalogo`), mas não excluído; intercorrência só cria e "reabre" (`PATCH .../reaberta`, task `isopen-intercorrencia-backend`), não edita/exclui de verdade.
- **Deploy/hosting em produção**: não definido; só ambiente local via Docker Compose.

## 8. Referências
- `docs/plan/backend-mvp/backend-mvp.md` — plano e decisões desta implementação.
- `docs/logs/backend-mvp.md` — o que foi de fato feito, desvios.
- `docs/plan/selecao-empresa-admin-front/selecao-empresa-admin-front.md` — login real (CNPJ+senha), `cnpj`/`senha`/`address` em `LavaRapido`, filtro `?lavaRapidoId=` em `GET /pedidos`.
- `docs/plan/migrar-servicos-disponibilidade-veiculos-backend/migrar-servicos-disponibilidade-veiculos-backend.md` — `Servico`/`Intercorrencia`, `/veiculos` derivado, migração das 3 telas do admin-front.
- `docs/plan/isopen-intercorrencia-backend/isopen-intercorrencia-backend.md` — `isOpen` calculado a partir de `Intercorrencia`, `intercorrenciaAtiva`, `PATCH /intercorrencias/:id` (reabrir).
- `WashAway/.specs/admin-front.specs.md` — seção 3.1/5, `BACKEND_API_BASE_URL` como padrão agora.
- `WashAway/.specs/app_mobile.specs.md` — seção 4.1, `BACKEND_API_BASE_URL` como padrão agora.
