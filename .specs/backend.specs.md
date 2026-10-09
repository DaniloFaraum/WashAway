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
   - **Atenção: o seed é destrutivo** — começa com `deleteMany()` em todas as tabelas (apaga empresas cadastradas pela UI). Para dados de apresentação use `npm run prisma:demo` (`prisma/demo.ts`): só insere, pula empresas cujo CNPJ já existe, nunca apaga. Cria 6 empresas em SP com serviços (combos), pedidos de hoje/ontem/amanhã em vários status, intercorrências (feriados, uma parcial e uma empresa fechada hoje) e uma solicitação de onboarding pendente (CNPJ `72645819000163`). Também cria o **cliente de exemplo do app** `mariana@exemplo.com` / senha `123456` (I2 — senha conhecida **só para desenvolvimento/demo**; idempotente pelo e-mail). Requer o catálogo e o contrato do seed já no banco.
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

**`isOpen` é calculado, não é o valor cru da coluna** (task `isopen-intercorrencia-backend`, `docs/plan/isopen-intercorrencia-backend/`): a coluna `LavaRapido.isOpen` continua existindo (fixada `true` no cadastro/seed, nunca escrita depois), mas `GET /lava-rapidos` e `GET /lava-rapidos/:id` retornam `isOpen: false` sempre que houver uma `Intercorrencia` "ativa agora" pra aquele lava-rápido — de dia inteiro (`diaInteiro: true`) na data de hoje, ou parcial (`diaInteiro: false`) com o horário atual do servidor dentro de `horaInicio`–`horaFim`. Intercorrências marcadas `reaberta: true` não contam mais (ver `PATCH /intercorrencias/:id`, seção 5) — é como o dono reverte manualmente um fechamento automático (ex.: intercorrência cadastrada por engano, ou que terminou antes do previsto). `GET /lava-rapidos/:id` (mas não a listagem, pra não pesar) também retorna `intercorrenciaAtiva: {...} | null` com a intercorrência que está causando o fechamento agora, se houver. Cálculo feito na leitura (sem cron/job). **Atualizado pelo I19** (abaixo): o `isOpen` passou a considerar também o horário de funcionamento, e data/hora são calculadas no fuso dos lava-rápidos.

**Horário de funcionamento + "está aberto?"** (I19 parte 1, `docs/plan/i19-horario-funcionamento/`, migration `20261009101307_horario_funcionamento`):

```prisma
model HorarioFuncionamento {
  id, lavaRapidoId -> LavaRapido (onDelete: Cascade),
  diaSemana Int,            # 0 = domingo … 6 = sábado
  fechado Boolean @default(false),
  abertura String?, fechamento String?   # "HH:mm" hora local; null quando fechado
  @@unique([lavaRapidoId, diaSemana])
}
```

- Um intervalo por dia (sem pausa de almoço). **Dia sem registro = sem restrição de horário** (só as intercorrências fecham) — vale para empresa nova do onboarding até o dono configurar.
- **Fuso** (`src/utils/fusoHorario.ts`): `FUSO_LAVA_RAPIDOS = process.env.TZ_LAVA_RAPIDOS || 'America/Sao_Paulo'`, único para todos; `partesLocais(instante)` → `{ data: 'YYYY-MM-DD', diaSemana, hora: 'HH:mm' }` via `Intl.DateTimeFormat`. Corrigiu o bug do `intercorrencias.service.ts`, que usava a data em UTC (`toISOString`) e a hora no fuso do servidor (`toTimeString`) — com o servidor em UTC, uma intercorrência de "hoje" às 21h de Brasília contava como "amanhã".
- **Função compartilhada** (`src/modules/horarios/disponibilidade.service.ts`), reaproveitada por I20 (validação do pedido) e I9 (busca por horário):
  - `estaAberto(lavaRapidoId, inicio, fim?)` → `{ aberto: true } | { aberto: false, motivo }`, com `motivo` = `{ tipo: 'fora_do_horario', horario: { abertura, fechamento } | null }` (`null` = dia fechado) ou `{ tipo: 'intercorrencia', intercorrencia }`. Sem `fim`, avalia o instante; com `fim`, o intervalo `[inicio, fim)`.
  - `listarAbertos(ids, inicio, fim?)` → `Map<id, Disponibilidade>` (uma query de horários e uma de intercorrências para todos).
  - `getHorarioDoDia(lavaRapidoId, data)` → `{ fechado, abertura, fechamento, definido }` do dia local.
  - Regras na função pura `avaliarDisponibilidade(horarioDoDia, intercorrenciasDoDia, inicioLocal, fimLocal?)`: aberto em `[abertura, fechamento)`; intervalo tem de caber inteiro no horário; intervalo que atravessa a meia-noite local = fechado; intercorrência de dia inteiro fecha; parcial fecha se `[horaInicio, horaFim)` intercepta; `reaberta: true` é ignorada (regra das intercorrências na função pura `intercorrenciaQueFecha`, usada também por `getIntercorrenciaAtiva` — uma regra só). O horário é conferido antes das intercorrências.
- **`isOpen`** de `GET /lavaRapidos` e `GET /lavaRapidos/:id` = coluna `isOpen` **e** `estaAberto(agora)`. O detalhe também traz `foraDoHorario: boolean` (fechado agora por estar fora do horário), `intercorrenciaAtiva` (continua, para o botão "Reabrir" do painel) e `horarios` (os 7 dias).
- **Dados de exemplo:** `prisma/horariosExemplo.ts` (seg–sex 08:00–18:00, sáb 08:00–12:00, dom fechado, e variações); `seed.ts` e `demo.ts` usam (o `demo.ts` só cria horário para lava-rápido que ainda não tem nenhum, inclusive empresas demo já existentes; "Lava-Rápido Augusta" abre aos domingos); `npx tsx prisma/aplicar-horarios-exemplo.ts` dá o horário padrão a **todo** lava-rápido sem horário (só insere, idempotente — já rodado no banco de dev).
- A **escrita** do horário (`PUT /lavaRapidos/:id/horarios`, protegida por `autenticar('lavaRapido')`) e a seção de edição no painel são a **parte 2** do I19 (depois do I17).

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

**Cliente do app** (I1, `docs/plan/i1-cadastro-cliente/`, migration `20261009102907_cliente`):

```prisma
model Cliente {
  id       String   @id @default(cuid())
  nome     String
  email    String   @unique   // salvo normalizado: trim + minúsculas
  senha    String             // hash bcrypt (custo 10)
  criadoEm DateTime @default(now())
}
```

O `email` é gravado e buscado **normalizado** (`normalizarEmail` em `clientes.validation.ts`), então o `@unique` garante unicidade sem diferenciar maiúsculas (`Ana@X.com` × `ana@x.com` → `409`). `clientes.service.ts` expõe `criarCliente`, `getClienteByEmail(email)` (normaliza antes), `getClienteById(id)`, `omitSenhaCliente` e `autenticarCliente(email, senha)`. A senha nunca sai em resposta nem em log: os controllers não logam o body e o middleware de erro de `app.ts` responde `400` a JSON malformado **sem** logar o erro do body-parser (que carrega o body cru).

## 5. Contrato de API implementado

**Documentação interativa** (`docs/plan/swagger-backend/`): `GET /api-docs` serve a UI do Swagger (`swagger-ui-express`) com todas as rotas abaixo; `GET /api-docs.json` devolve o documento OpenAPI 3.0 cru (útil pra importar em Postman/Insomnia). Documento escrito à mão em `backend/src/docs/openapi.ts` (objeto TS, não gerado via `swagger-jsdoc`/comentários) — precisa ser atualizado manualmente quando uma rota muda; não há teste que garanta que o spec bate com o comportamento real além do smoke test de que os endpoints respondem.

| Rota | Método | Descrição |
|---|---|---|
| `/lava-rapidos` | `GET` | Lista todos. `isOpen` é calculado (ver nota acima); não inclui `intercorrenciaAtiva` (só o detalhe). |
| `/lava-rapidos/:id` | `GET` | Um lava-rápido; `404` se não existir. `isOpen` é calculado (ver nota acima); inclui `intercorrenciaAtiva` (`{...} \| null`), `foraDoHorario` e `horarios` (7 dias). |
| `/lavaRapidos/:id/horarios` | `GET` | Público. Horário semanal: sempre os 7 dias na ordem 0 (domingo) a 6; dia não cadastrado volta `{ diaSemana, fechado: false, abertura: null, fechamento: null, definido: false }`. `404` se o lava-rápido não existir. |
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
| `/auth/cliente/cadastro` | `POST` | Público (I1). Body `{ nome, email, senha }`: nome obrigatório (trim), e-mail obrigatório no formato `^[^\s@]+@[^\s@]+\.[^\s@]+$`, senha com no mínimo 6 caracteres. `400 { error, campos: { nome?, email?, senha? } }`; `409 { error: 'Este e-mail já está cadastrado' }` (sem diferenciar maiúsculas); `201` com o `Cliente` sem `senha`. |
| `/auth/cliente/login` | `POST` | Público (I2). Body `{ email, senha }` (e-mail normalizado). `200 { token, expiraEm, cliente }` (cliente sem `senha`); `401 { error: 'E-mail ou senha incorretos' }` — **mesma** resposta para e-mail inexistente, senha errada ou body incompleto (e o mesmo tempo de resposta: compara com um hash fictício quando o e-mail não existe). |
| `/clientes/me` | `GET` | `autenticar('cliente')` (I2). `200` com o cliente do token (sem `senha`); `401` sem token, com token inválido/expirado ou se o cliente não existir mais; `403` com token de outro tipo. Recursos do cliente logado ficam em `/clientes/me/...` (I3, I13, I18). |
| `/contratos/vigente` | `GET` | Contrato vigente do onboarding (maior `versao` com `vigente: true`); `404` se não houver. |
| `/onboarding/solicitacoes` | `POST` | Body `{ name, address?, cnpj }`. `400` se `name` faltar/`cnpj` não tiver 14 dígitos; `409` se o `cnpj` já for um `LavaRapido`; `200` devolvendo a solicitação existente se já houver uma `aguardando_contrato` com o mesmo `cnpj` (retomar); `503` se não houver contrato vigente; senão `201` com a solicitação (`status: aguardando_contrato`) + `contrato: { id, versao, titulo, conteudo }`. |
| `/onboarding/solicitacoes/:id` | `GET` | Status + contrato da solicitação; `404` se não existir. |
| `/onboarding/solicitacoes/:id/aceite` | `POST` | Body `{ aceite: "eu aceito" }` (trim, case-insensitive; senão `400`). Numa transação: cria o `LavaRapido` (mesma `criarLavaRapido` do `POST /lavaRapidos`, senha `admin`) e marca a solicitação `concluida` + `aceitoEm` + `lavaRapidoId`. `201` com o `LavaRapido` (sem `senha`); `404` se não existir; `409` se já concluída (ou se o CNPJ foi cadastrado por outro caminho nesse meio-tempo). |

**`POST /lavaRapidos` é legado/interno** desde `onboarding-contrato-empresa`: continua funcionando (seed, testes, uso administrativo), mas o admin-front cadastra empresas só pelo fluxo `/onboarding`.

**Desvio da decisão original do plano**: o plano previa uma rota específica `PATCH /pedidos/:id/status`. Na implementação, isso quebraria com o `pedidos.routes.js` do admin-front (que já usa `PATCH /pedidos/:id` genérico) e com o `json-server` de fallback (que não suporta sub-rotas customizadas — não tem `--routes`/rewrite nessa versão). Mantida `PATCH /pedidos/:id`, com a mesma segurança pretendida (só `status` é aceito, qualquer outro campo no body é ignorado) garantida na validação do controller, não na URL. Isso preserva o critério "zero mudança de código além da `BASE_URL`" nos dois front-ends.

As 3 telas `Serviços`/`Disponibilidade`/`Veículos` do admin-front usam este backend real desde `migrar-servicos-disponibilidade-veiculos-backend` (ver `admin-front.specs.md` seção 8) — o `json-server` próprio delas continua existindo só como fallback manual, mesmo padrão já adotado pra `/pedidos`. `POST /pedidos` continua não implementado (I13). Autenticação: ver seção 5.2.

## 5.1 E-mail (outbox + worker)

Plano `docs/plan/i17-email-eventos/`. Infraestrutura usada pelos e-mails do I17 (senha gerada, "esqueci minha senha", exclusão) — os e-mails em si ficam com os planos consumidores.

**Fluxo:** a ação que gera e-mail chama `enfileirarEmail(tx, { tipo, destinatario, assunto, corpo })` (`src/modules/email/email.service.ts`) **dentro da sua transação** → grava um `EventoEmail` `pendente` e faz `pg_notify('email_pendente', id)` → o Postgres só entrega o `NOTIFY` no commit (rollback = nenhum e-mail) → o worker Python (`scripts/email_worker.py`) acorda, envia e atualiza o status. **Nenhum outro módulo envia e-mail direto**, e não há rota HTTP de e-mail.

```prisma
enum StatusEventoEmail { pendente enviado erro }
enum TipoEventoEmail { teste }    # cada plano consumidor acrescenta os seus valores
model EventoEmail {
  id, tipo, destinatario, assunto, corpo, status @default(pendente),
  tentativas Int @default(0), ultimoErro String?, proximaTentativaEm DateTime?,
  criadoEm, enviadoEm DateTime?
  @@index([status, criadoEm])
}
```

**Worker** (`scripts/email_worker.py`, Python 3 + `psycopg` 3):
- `LISTEN email_pendente` + varredura periódica (`EMAIL_VARREDURA_SEGUNDOS`, 30 s) como garantia caso um `NOTIFY` se perca (worker parado, reconexão).
- Pega os eventos **um por transação** com `SELECT … LIMIT 1 FOR UPDATE SKIP LOCKED`: dois workers juntos nunca enviam o mesmo e-mail, a trava fica só no e-mail sendo enviado e uma falha depois do envio não desfaz o status de outros e-mails já enviados.
- Sucesso → `enviado` + `enviadoEm`, e o **corpo é mascarado** (`"[enviado — conteúdo removido]"`, pode conter senha). Falha → `erro`, `tentativas + 1`, `ultimoErro` e `proximaTentativaEm` com espera crescente (`EMAIL_ESPERA_BASE_SEGUNDOS` × 2^(tentativas−1): 30 s, 60 s, 120 s…). Ao atingir `EMAIL_MAX_TENTATIVAS` (5) fica em `erro` definitivo, com o motivo (reprocessar = pelo pgAdmin, voltando `status` para `pendente`). **Atenção:** o corpo de um e-mail em `erro` (inclusive definitivo) **não** é mascarado — é ele que permite o reprocessamento —, então pode ficar com senha em claro no banco; depois de resolver o caso, reprocessar ou apagar/mascarar o evento à mão.
- Log: só id, tipo, destinatário e status — **nunca o corpo**.
- Transportes (`EMAIL_TRANSPORTE`): `arquivo` (padrão, dev/teste) grava `WashAway/.emails/<data>-<id>.eml` (pasta no `.gitignore`; abre em qualquer cliente de e-mail ou editor de texto); `smtp` (produção) usa `SMTP_HOST`, `SMTP_PORT` (465 = SSL, senão STARTTLS), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Configuração por variável de ambiente; o que faltar vem do `backend/.env` (`DATABASE_URL` etc. — ver `.env.example`).

**Rodar:**
- Instalar (uma vez): `python3 -m venv scripts/.venv && scripts/.venv/bin/pip install -r scripts/requirements.txt` (se o Python do sistema não tiver `ensurepip`: `python3 -m venv --without-pip scripts/.venv` + `get-pip.py`). O `scripts/.venv/` está no `.gitignore`.
- `scripts/.venv/bin/python scripts/email_worker.py` (contínuo) ou `… --uma-vez` (processa os pendentes e sai; código ≠ 0 se algum envio falhar — útil em CI).
- `python3 scripts/restart.py` já sobe o worker junto (`--project email-worker`, log em `/tmp/washaway-email-worker.log`), usando o `scripts/.venv` se existir.
- **Ver os e-mails em dev:** arquivos em `WashAway/.emails/`; a fila fica na tabela `EventoEmail` (pgAdmin: `SELECT id, tipo, destinatario, status, tentativas, "ultimoErro" FROM "EventoEmail" ORDER BY "criadoEm" DESC`).

**Testes:** `src/test/email.test.ts` (enfileirar com commit deixa `pendente`; com rollback não deixa nada) e helper `emailsEnfileirados(destinatario)` em `src/test/helpers/email.ts` para os consumidores conferirem o e-mail sem rodar o worker. Worker: `scripts/test_email_worker.py` (`unittest`, contra `washaway_test`, transporte falso) — `python3 scripts/test.py --project email-worker`.

## 5.2 Autenticação (token de acesso)

Planos `docs/plan/i2-login-cliente/` (infra + cliente) e `i17-*` (lava-rápido, interno, escopo de troca de senha). **Contrato único** para cliente, lava-rápido e interno:

- **Token**: JWT **HS256** (`jsonwebtoken`), segredo em `JWT_SECRET` (obrigatório — `server.ts` chama `garantirConfiguracaoDoToken()` e não sobe sem ele; nunca no código), validade `JWT_EXPIRES_IN` (padrão `7d`). Nos testes, `vitest.config.ts` define um segredo fixo de teste.
- **Payload**: `{ sub: <id>, tipo: 'cliente' | 'lavaRapido' | 'interno', permissoes?: string[], escopo?: string }`. `permissoes` só para `interno` (ex.: `['admin']`); `escopo` marca token de uso restrito (ex.: `'trocar-senha'`, i17-senha-gerada).
- **`src/auth/token.ts`**:
  - `assinarToken({ id, tipo, permissoes?, escopo? }): string`
  - `verificarToken(token): Autenticacao` — `{ id, tipo, permissoes, escopo? }` (`permissoes` vira `[]` quando ausente); lança erro se o token for inválido, expirado, assinado com outro segredo/algoritmo (inclusive `alg: none`) ou com payload fora do contrato (sem `sub`, `tipo` desconhecido).
  - `expiracaoDoToken(token): string` (ISO) e `garantirConfiguracaoDoToken()`.
- **`src/auth/types.ts`**: `TIPOS_USUARIO`, `TipoUsuario`, `Autenticacao` e a tipagem global `Express.Request['auth']`.
- **`src/middlewares/autenticar.ts`** — `autenticar(...tipos: TipoUsuario[])` (**autenticação**: quem é). Lê `Authorization: Bearer <token>`:
  - sem header/esquema `Bearer`, token inválido ou expirado → **`401 { error }`**;
  - token válido de um tipo fora de `tipos` → **`403 { error }`**;
  - token com `escopo` (uso restrito) → **`403 { error }`** — o i17-senha-gerada libera o escopo `trocar-senha` só na rota de troca;
  - ok → `req.auth = { id, tipo, permissoes, escopo? }` e `next()`.
  - Chamar sem nenhum tipo lança erro na montagem da rota. Uso: `router.get('/me', autenticar('cliente'), asyncHandler(me))`; o I17 usa `autenticar('lavaRapido')` e `autenticar('interno')`.
- **Permissão** fica separada: `autorizar(...permissoes)` (`src/middlewares/autorizar.ts`, i17-interno-exclusao) depois de `autenticar`, `403` se faltar a permissão.
- Rotas públicas de leitura (`/lavaRapidos`, `/servicos`, `/intercorrencias`) continuam sem token.

## 6. Organização de pastas

```
backend/
├── docker-compose.yml
├── .env.example                     # DATABASE_URL, TEST_DATABASE_URL, PORT, JWT_SECRET, JWT_EXPIRES_IN, EMAIL_*
├── prisma/
│   ├── schema.prisma
│   ├── migrations/                  # geradas por `prisma migrate dev`
│   ├── seed.ts                      # DESTRUTIVO: apaga tudo e recria os dados de exemplo
│   └── demo.ts                      # dados de apresentação (npm run prisma:demo) — só insere, idempotente por CNPJ
├── src/
│   ├── app.ts                       # createApp() — monta o Express, sem dar listen
│   ├── server.ts                    # importa createApp() e sobe na porta 4000
│   ├── config/
│   │   └── prisma.ts                # PrismaClient singleton
│   ├── auth/
│   │   ├── token.ts                 # assinarToken / verificarToken (JWT HS256) — seção 5.2
│   │   └── types.ts                 # TipoUsuario, Autenticacao, req.auth
│   ├── middlewares/
│   │   ├── asyncHandler.ts
│   │   └── autenticar.ts            # autenticar(...tipos) → req.auth; 401/403
│   ├── docs/
│   │   └── openapi.ts                # documento OpenAPI 3.0 (objeto TS, escrito à mão) servido em /api-docs
│   ├── modules/
│   │   ├── lava-rapidos/{lavaRapidos.routes,controller,service}.ts
│   │   ├── clientes/{clientes.routes,controller,service,validation}.ts  # I1/I2: /auth/cliente/{cadastro,login}, /clientes/me
│   │   ├── contratos/{contratos.routes,controller,service}.ts       # "BackEnd Onboard": contrato vigente
│   │   ├── onboarding/{onboarding.routes,controller,service,validation}.ts  # solicitação → aceite → cria LavaRapido
│   │   ├── pedidos/{pedidos.routes,controller,service}.ts
│   │   ├── servicos/{servicos.routes,controller,service,validation}.ts
│   │   ├── itens-servico/{itensServico.routes,controller,service}.ts   # catálogo global, só leitura
│   │   ├── intercorrencias/{intercorrencias.routes,controller,service,validation}.ts
│   │   ├── email/email.service.ts   # enfileirarEmail — outbox de e-mail (seção 5.1)
│   │   ├── horarios/{horarios.routes,controller,service}.ts + disponibilidade.service.ts  # I19: horário semanal + estaAberto/listarAbertos
│   │   └── veiculos/{veiculos.routes,controller,service}.ts   # sem model Prisma próprio — deriva de Pedido
│   ├── utils/
│   │   ├── fusoHorario.ts           # FUSO_LAVA_RAPIDOS + partesLocais (I19)
│   │   └── queryParam.ts            # getStringQueryParam — normaliza ?lavaRapidoId= (string ou array), usado por todos os módulos acima
│   └── test/
│       ├── globalSetup.ts           # docker compose up (fora do CI) + cria/migra washaway_test_1..N (um por worker)
│       ├── setupBancoDoWorker.ts    # setupFiles: DATABASE_URL = banco do worker (VITEST_POOL_ID)
│       ├── testDatabaseUrl.ts       # TEST_DATABASE_URL base + nome/URL do banco de cada worker
│       ├── helpers/                 # factories.ts, limpeza.ts, auth.ts (ver seção 6.1)
│       ├── lavaRapidos.test.ts
│       ├── pedidos.test.ts
│       ├── servicos.test.ts
│       ├── itensServico.test.ts
│       ├── intercorrencias.test.ts
│       ├── veiculos.test.ts
│       ├── contratos.test.ts
│       ├── onboarding.test.ts
│       ├── clientes.test.ts         # I1: cadastro
│       ├── clientesAuth.test.ts     # I2: login, /clientes/me, token expirado/inválido
│       ├── autenticar.test.ts       # contrato do middleware (401 × 403, escopo, vários tipos)
│       └── openApiDocs.test.ts      # smoke test: /api-docs (HTML) e /api-docs.json (OpenAPI cru) respondem
└── vitest.config.ts                 # projetos `unit` e `integracao`; cobertura v8; exclui dist/ (ver nota)
```

**Nota**: `vitest.config.ts` exclui explicitamente `dist/**` — sem isso, depois de um `npm run build`, o Vitest também descobre e roda os `.test.js` compilados em `dist/`, duplicando cada teste (achado durante a validação desta task).

## 6.1 Testes — estratégia e convenções

Pirâmide do projeto (vale para os três projetos; aqui o detalhe do backend):

| Nível | Onde | O que cobre | Roda com |
|---|---|---|---|
| **Unitário** | `src/**/*.unit.test.ts`, ao lado do código | Regras puras de domínio, sem rede nem banco: validações (`*.validation.ts`), placa (I3), transições de status (I15), "está aberto em data/hora" (I19/I20/I9), preço/duração (I13), formatação. | `npm run test:unit` (sem Docker; `DATABASE_URL` aponta pra um endereço inválido de propósito) |
| **Integração de API** | `src/test/*.test.ts` | Cada rota via supertest → controller → service → Prisma → Postgres de teste, com os casos que a história pede (sucesso, 400/401/404/409). **É o nível exigido pela maioria dos critérios "Testes automatizados".** | `npm run test:integracao` |
| **Ponta a ponta** | `src/test/*.test.ts` (supertest) | Só o fluxo principal do I13: cliente cria o pedido → o lava-rápido certo vê → outro lava-rápido não vê. Entra junto com o I13. | `npm run test` |

`npm run test` roda unit + integração; `npm run test:coverage` faz o mesmo com relatório de cobertura (`coverage/`, só relatório, não bloqueia PR). Pela raiz: `python3 scripts/test.py --project backend` (ou `--project all` pros três projetos).

**Banco de teste — um por worker.** O `globalSetup` (projeto `integracao`) sobe o Postgres do docker-compose (pulado quando `CI=true`; no GitHub Actions o Postgres é um `services:` do job), cria `washaway_test_1..N` (N = `maxWorkers` do Vitest) se não existirem e roda `prisma migrate deploy` em cada um (e no `washaway_test` base, usado pelo teste do worker de e-mail). O `setupBancoDoWorker.ts` aponta o `DATABASE_URL` de cada worker para `washaway_test_<VITEST_POOL_ID>`. Nada é apagado no setup — os bancos acumulam o que um teste interrompido deixar, por isso as factories geram valores únicos. Nunca aponta para o banco de dev `washaway`.

**Helpers (`src/test/helpers/`):**
- `factories.ts` — `criarLavaRapidoTeste(overrides)` (com `senha` em texto puro opcional, gravada com bcrypt), `criarItemServicoTeste`, `criarServicoTeste(lavaRapidoId, { itemIds })`, `criarPedidoTeste(lavaRapidoId, overrides)`, `criarClienteTeste(overrides)` (I1; `senha` em texto puro opcional — padrão `SENHA_CLIENTE_TESTE` —, gravada com bcrypt; e-mail único), mais `cnpjUnico()`, `placaUnica()`, `sufixoUnico()`. Cada factory registra o id criado para limpeza. `criarVeiculoTeste` (I3) entra aqui junto com o model, no mesmo formato.
- `limpeza.ts` — `limparDadosDeTeste()` apaga só o que as factories (ou `registrarParaLimpeza(modelo, id)`) registraram neste arquivo, na ordem certa. Nada de `deleteMany` global.
- `auth.ts` — `comToken(req, token)` (header `Authorization: Bearer`); `tokenDeCliente(cliente)` gera o token direto com `assinarToken` (sem passar pela rota de login); `tokenDeLavaRapido(lavaRapido)` ainda é stub que lança erro até o I17 — quem implementar troca o corpo, mantendo a assinatura.
- `email.ts` — `emailsEnfileirados(destinatario)` (I17-email, seção 5.1).

**Esqueleto de um arquivo de integração:**

```ts
const app = createApp()

describe('POST /algo', () => {
  let lavaRapidoId: string

  beforeAll(async () => {
    lavaRapidoId = (await criarLavaRapidoTeste()).id
  })

  afterAll(async () => {
    await limparDadosDeTeste()
    await prisma.$disconnect()
  })

  it('caso citado no critério, com o mesmo texto', async () => { /* ... */ })
})
```

**Convenção para as histórias:** cada critério "Testes automatizados: A, B, C" vira um `describe` com **um `it` por caso citado, com o mesmo texto** do critério. Assim o `task-review` confere critério ↔ teste lendo os nomes.

**Migração para as factories é incremental:** cada história que mexer num arquivo de teste existente migra esse arquivo. Hoje `pedidos.test.ts` é o exemplo migrado; os demais ainda criam `prisma.lavaRapido.create` à mão.

**CI:** `.github/workflows/testes.yml` roda em todo PR e push na `main`, um job por projeto. Backend: `npm ci` → `prisma generate` → `npm run build` (o backend não tem linter; o `tsc` é a checagem estática) → `npm run test:coverage`.

## 7. Próximos passos / domínio ainda não implementado

O domínio completo imaginado originalmente continua válido como direção — só não faz parte deste MVP:

```
Usuario
  id, nome, email, papel: 'consumidor' | 'dono_lava_rapido'
```

`Servico` e `Veiculo` (que apareciam aqui antes) já existem — `Servico` como model Prisma real, `Veiculo` derivado de `Pedido.veiculo` (ver seção 4/5).

- **Autenticação**: a infraestrutura de token (JWT) e o login do **cliente** existem (seção 5.2). O login do `admin-front` por `LavaRapido` (CNPJ + senha fixa "admin") ainda não emite token: as rotas de gestão (`GET /pedidos`, `POST /servicos` etc.) continuam sem middleware até o I17 (`autenticar('lavaRapido')`). Sem refresh token, troca/recuperação de senha do cliente.
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
