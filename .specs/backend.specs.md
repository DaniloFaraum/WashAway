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
   - **Atenção: o seed é destrutivo** — começa com `deleteMany()` em todas as tabelas (apaga empresas cadastradas pela UI). Para dados de apresentação use `npm run prisma:demo` (`prisma/demo.ts`): só insere, pula empresas cujo CNPJ já existe, nunca apaga. Cria 6 empresas em SP com serviços (combos), pedidos de hoje/ontem/amanhã em vários status, intercorrências (feriados, uma parcial e uma empresa fechada hoje) e uma solicitação de onboarding pendente (CNPJ `72645819000163`). Também cria os **clientes de exemplo do app** (`mariana@exemplo.com`, `carlos@`, `juliana@`, `rafael@`, `beatriz@`, `pedro@`, `fernanda@exemplo.com`), todos com senha `123456` (senha conhecida **só para desenvolvimento/demo**; idempotentes pelo e-mail) e seus veículos (por placa); os pedidos das empresas criadas pela demo são desses clientes/veículos, no formato do I13 (helpers em `prisma/pedidosExemplo.ts`). O seed também cria 2 clientes (`ana@`/`bruno@exemplo.com`, senha `123456`) e os 3 pedidos no formato novo; ele apaga os pedidos mas não apaga clientes. Requer o catálogo e o contrato do seed já no banco.
   - **Senhas de exemplo do painel (I17 — só para desenvolvimento):** empresas **criadas** pelo `demo.ts`/`seed.ts` a partir do I17 entram com a senha `demo1234` e um e-mail de exemplo (`demo.ts`: nome em slug, ex.: `lava-jato-vila-madalena@exemplo.com`; `seed.ts`: `empresa101@exemplo.com` … `empresa105@exemplo.com`); a solicitação pendente do demo também usa `demo1234`. Empresas que **já existiam** no banco de dev antes do I17 (senha `admin`, sem e-mail) saem do `admin` com o script de troca em massa do `i17-senha-gerada` — rodar **uma vez**: `npm run senhas:troca-em-massa` (seção 5.5); a senha temporária de cada uma chega por e-mail (em dev, `.emails/` do worker; as sem e-mail em `cnpj-<cnpj>@washaway.dev`).
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

enum PedidoStatus {          # I15: pendente → aceito | recusado; aceito → em_andamento → concluido
  pendente
  aceito
  recusado
  em_andamento
  concluido
}

model Pedido {               # I13: criado pelo cliente do app (POST /pedidos)
  id             String       @id @default(cuid())
  lavaRapidoId   String       # onDelete: Cascade
  clienteId      String       # Cliente (I1) — onDelete: Restrict
  veiculoId      String       # Veiculo do cliente (I3) — onDelete: Restrict
  horario        DateTime     # início do atendimento (UTC; o app envia ISO com offset)
  status         PedidoStatus @default(pendente)
  fotos          String[]     # URLs estáticas (mock) — upload real não existe (seção 7)
  precoTotal     Float        # soma dos preços dos serviços, calculada NO SERVIDOR
  duracaoMinutos Int          # soma das durações dos serviços, calculada NO SERVIDOR
  criadoEm       DateTime     @default(now())
  statusAlteradoEm DateTime?  # I15: última mudança de status (null = nunca mudou)
  motivoRecusa   String?      # I15: só em recusado, até 200 caracteres (validado na API)
  recusaVistaEm  DateTime?    # I18: quando o cliente viu a recusa no app (null = não viu)
  servicos       PedidoServico[]
}

model PedidoServico {        # serviço comprado: snapshot do momento da compra
  id             String  @id
  pedidoId       String  # onDelete: Cascade
  servicoId      String? # referência informativa; SetNull se o Servico sumir
  nome           String
  preco          Float
  duracaoMinutos Int
  ordem          Int     # ordem em que o cliente escolheu
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

**Catálogo × combo** (`docs/plan/servicos-combos-catalogo/`): a loja não declara em texto livre o que faz — ela monta seus `Servico`s (combos) escolhendo 1+ `ItemServico` de um catálogo global (lavagem externa, aspiração, secagem, polimento…, 18 itens em 4 categorias no seed). Não existe rota pra criar item; o catálogo só muda via seed/banco. O campo livre `Servico.categoria` foi removido (migration `20261003020000_servicos_combos_catalogo`, que também apaga os `Servico` antigos — só dado de seed); a API devolve `categorias` derivadas dos itens. **Duração** (`docs/plan/tempo-estimado-preco-servicos/`): cada `ItemServico` tem `duracaoMinutos` (migration `20261003030000_duracao_item_servico`, valores no seed); a duração do combo é **derivada** na resposta (soma dos itens), sem coluna própria. O model `Veiculo` (I3) é o veículo **do cliente do app** (abaixo); desde o I13 o `Pedido` aponta para ele (`veiculoId`) e o `GET /veiculos` do painel lista os veículos distintos dos pedidos da empresa por essa relação (ver seção 5).

**Pedido com vários serviços (I13, `docs/plan/i13-confirmacao-agendamento/`):** o pedido guarda `clienteId`, `veiculoId`, `precoTotal`, `duracaoMinutos` e os itens em `PedidoServico` com **nome, preço e duração congelados** no momento da compra (mudar o serviço depois não altera pedidos feitos). A migration `20261017120000_pedido_cliente_servicos` **converteu os pedidos antigos sem apagar nenhum**: para cada placa distinta criou (ou reaproveitou) um `Cliente` "Cliente de pedido antigo" (e-mail técnico `pedido-antigo-<placa>@legado.washaway.local`, senha que ninguém conhece) e um `Veiculo` com o modelo/placa do JSON (cor "Não informada"); cada pedido ganhou um `PedidoServico` com o nome antigo e preço/duração do `Servico` de mesmo nome do lava-rápido (0 se não houver); depois `Pedido.veiculo` (JSON) e `Pedido.servico` (texto) foram removidos. Cliente/veículo com pedido não podem ser apagados (`Restrict`): `DELETE /clientes/me/veiculos/:id` responde `409`.

**Desvio do plano — `Intercorrencia.data` é `String`, não `DateTime`**: o plano original especificava `DateTime`, mas `admin-front/src/pages/disponibilidade/Disponibilidade.jsx` casa esse campo por igualdade exata de string no formato `"YYYY-MM-DD"` (marcação de dias no calendário via `dayjs().format('YYYY-MM-DD')`). Um `DateTime` serializaria como ISO completo (`"2026-10-12T00:00:00.000Z"`) e quebraria silenciosamente esse match — nenhum dia apareceria marcado no calendário. `String` guarda exatamente o formato que o front já espera, sem semântica de data no servidor (não há nenhuma ordenação/cálculo por data feito no backend que justificasse `DateTime`).

`LavaRapido` usa o formato de campos do **app_mobile** (`name`, `rating`, `reviewsCount`, `distance`, `time`, `price`, `image`), não o esboço inicial deste spec (`nome`/`endereco`) — decisão tomada na implementação pra bater exatamente com `lavaRapidos.model.ts` sem exigir nenhuma mudança de `model` no front. **`price` é calculado** (`tempo-estimado-preco-servicos`): `GET /lavaRapidos` e `GET /lavaRapidos/:id` devolvem `price` = menor `preco` entre os `Servico`s **ativos** da loja (um `groupBy` só para a lista), ou `null` sem serviço ativo — a coluna `LavaRapido.price` continua no banco mas não é mais o valor exibido. `distance`/`time` continuam sendo campos estáticos persistidos (copiando o mock), não calculados a partir da localização real do consumidor — mesma limitação que já existia, não resolvida aqui.

`cnpj`/`senha` foram adicionados na task `selecao-empresa-admin-front` (`docs/plan/selecao-empresa-admin-front/`) pra dar ao admin-front um login real por empresa: `cnpj` é único (formato validado só como 14 dígitos numéricos, sem dígito verificador). Até o I17 a `senha` era sempre o hash bcrypt de `"admin"`; **desde o I17** (`docs/plan/i17-acesso-seguro-painel/`, migration `20261010144533_acesso_seguro_painel`) a empresa define a própria senha (mín. 8 caracteres) e um **e-mail** (`LavaRapido.email String? @unique`, normalizado trim + minúsculas; opcional só por causa das empresas antigas) na solicitação do onboarding — ver seção 5. **Senha gerada** (`i17-senha-gerada`, migration `20261017130500_senha_gerada`): `LavaRapido.senhaGerada String?` (hash bcrypt de uma senha temporária enviada por e-mail — seção 5.5). Nenhuma rota expõe `senha` nem `senhaGerada`; as rotas públicas (`GET /lavaRapidos`, `GET /lavaRapidos/:id`) também não expõem o `email` (só a sessão do painel — login/aceite — devolve).

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
- **Busca por horário** (I9, `docs/plan/i9-busca-por-horario/`): `GET /lavaRapidos?horario=<ISO com fuso>` devolve só os lava-rápidos abertos naquele instante, pela mesma regra (coluna `isOpen` **e** `listarAbertos(ids, horario)`, sem `fim`). O `isOpen` da resposta continua sendo "aberto agora". Validação em `lavaRapidos.validation.ts#validarHorarioBusca`: ISO com fuso explícito e data existente (a mesma regra do `POST /pedidos`, `isIsoComFusoValido`), não no passado (tolerância de 1 min) e no máximo 30 dias à frente. Se falhar: `400 { error }`. Sem `horario`, nada muda. Testes: `src/test/lavaRapidosHorario.test.ts` e `lavaRapidos.validation.unit.test.ts`.
- **Dados de exemplo:** `prisma/horariosExemplo.ts` (seg–sex 08:00–18:00, sáb 08:00–12:00, dom fechado, e variações); `seed.ts` e `demo.ts` usam (o `demo.ts` só cria horário para lava-rápido que ainda não tem nenhum, inclusive empresas demo já existentes; "Lava-Rápido Augusta" abre aos domingos); `npx tsx prisma/aplicar-horarios-exemplo.ts` dá o horário padrão a **todo** lava-rápido sem horário (só insere, idempotente — já rodado no banco de dev).
- **Escrita** (I19 parte 2): `PUT /lavaRapidos/:id/horarios` com `autenticar('lavaRapido')` — a empresa vem do token; `:id` de outra empresa = `404` (isolamento, seção 5.2), sem alterar nada. Body `{ dias }` com exatamente os 7 dias, validado em `horarios.validation.ts` (`parseHorariosInput`, `400` com mensagem clara: dia fora de 0..6/repetido/faltando, "HH:mm" 00:00–23:59, abertura/fechamento faltando num dia aberto ou informados num dia fechado, "Abertura de segunda deve ser antes do fechamento"). Substitui os 7 dias numa transação (`substituirHorarios`) e devolve os 7 dias como o `GET`.

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

**Veículo do cliente** (I3, `docs/plan/i3-cadastro-veiculo/`, migration `20261010144438_veiculo_cliente`):

```prisma
model Veiculo {
  id        String   @id @default(cuid())
  clienteId String
  cliente   Cliente  @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  marca     String?            // opcional
  modelo    String
  cor       String
  placa     String             // salva normalizada: sem hífen/espaços, maiúsculas
  criadoEm  DateTime @default(now())

  @@unique([clienteId, placa]) // placa única por cliente; a mesma placa pode existir em clientes diferentes
}
```

Regra de placa (`modules/veiculos-cliente/placa.ts`): `normalizarPlaca` remove hífen e espaços e passa para maiúsculas; `isPlacaValida` aceita, **depois de normalizar**, o formato antigo `^[A-Z]{3}[0-9]{4}$` (ABC-1234) ou o Mercosul `^[A-Z]{3}[0-9][A-Z][0-9]{2}$` (ABC1D23). O app usa a mesma regra antes de enviar (`app_mobile/src/features/veiculos/placa.ts`). `veiculosCliente.service.ts` expõe `listarVeiculosDoCliente`, `criarVeiculoDoCliente`, `atualizarVeiculoDoCliente`, `removerVeiculoDoCliente` e **`getVeiculoDoCliente(clienteId, veiculoId)` → `Veiculo | null`** (o I13 usa para validar que o `veiculoId` do pedido é do cliente). Toda busca/alteração filtra por `{ id, clienteId }`: veículo de outro cliente é "não encontrado" (`404`), nunca `403`. **Não confundir** com o `GET /veiculos` do painel (`modules/veiculos`), que continua derivando de `Pedido.veiculo`.

## 5. Contrato de API implementado

**Documentação interativa** (`docs/plan/swagger-backend/`): `GET /api-docs` serve a UI do Swagger (`swagger-ui-express`) com todas as rotas abaixo; `GET /api-docs.json` devolve o documento OpenAPI 3.0 cru (útil pra importar em Postman/Insomnia). Documento escrito à mão em `backend/src/docs/openapi.ts` (objeto TS, não gerado via `swagger-jsdoc`/comentários) — precisa ser atualizado manualmente quando uma rota muda; não há teste que garanta que o spec bate com o comportamento real além do smoke test de que os endpoints respondem.

| Rota | Método | Descrição |
|---|---|---|
| `/lava-rapidos` | `GET` | Lista todos. `isOpen` é calculado (ver nota acima); não inclui `intercorrenciaAtiva` (só o detalhe). `?horario=<ISO com fuso>` (I9): só os abertos naquele instante; `400` se estiver malformado, sem fuso, no passado ou a mais de 30 dias. |
| `/lava-rapidos/:id` | `GET` | Um lava-rápido; `404` se não existir. `isOpen` é calculado (ver nota acima); inclui `intercorrenciaAtiva` (`{...} \| null`), `foraDoHorario` e `horarios` (7 dias). |
| `/lavaRapidos/:id/horarios` | `GET` | Público. Horário semanal: sempre os 7 dias na ordem 0 (domingo) a 6; dia não cadastrado volta `{ diaSemana, fechado: false, abertura: null, fechamento: null, definido: false }`. `404` se o lava-rápido não existir. |
| `/lavaRapidos/:id/horarios` | `PUT` | Painel (`autenticar('lavaRapido')`, I19 parte 2). Body `{ dias: [{ diaSemana, fechado, abertura?, fechamento? }] }` com os 7 dias; substitui tudo e devolve os 7 dias. `400` com mensagem (validação), `401` sem token/empresa do token inexistente, `403` token de cliente, `404` `:id` de outra empresa. |
| `/lava-rapidos/login` | `POST` | Público, com **limite de tentativas** (seção 5.3). Body `{ cnpj, senha }`; `401` se `cnpj` não existir ou `senha` não bater (bcrypt compare contra um hash fictício quando o CNPJ não existe — mesmo tempo de resposta); `200 { token, expiraEm, trocaDeSenhaObrigatoria, lavaRapido }` (I17): token de **lava-rápido** e a empresa no mesmo formato de `GET /lavaRapidos/:id` (com `horarios`, `foraDoHorario`, `intercorrenciaAtiva`, `email`; sem `senha`/`senhaGerada`). Senha própria → `trocaDeSenhaObrigatoria: false` (e a `senhaGerada`, se havia, vira `null`); **senha gerada** → `trocaDeSenhaObrigatoria: true` e token de escopo `trocar-senha` (seção 5.5). |
| `/auth/lava-rapido/trocar-senha` | `POST` | `i17-senha-gerada` (seção 5.5). Token de escopo `trocar-senha` (body `{ novaSenha }`) **ou** token normal (body `{ novaSenha, senhaAtual }`). `400` nova senha fora de 8–72 bytes ou igual à senha gerada; `401` sem token/inválido/expirado, empresa inexistente ou token de troca já usado (sem `senhaGerada`); `403` senha atual errada, outro tipo ou outro escopo; `429` limite (só falhas, por IP). `200` = sessão normal `{ token, expiraEm, trocaDeSenhaObrigatoria: false, lavaRapido }`; grava a nova `senha` e zera a `senhaGerada`. |
| `/auth/lava-rapido/esqueci-senha` | `POST` | Público (`i17-senha-gerada`). Body `{ email }`; `400` se faltar ou for inválido; senão **sempre** `200 { mensagem: 'Se o e-mail estiver cadastrado, enviaremos uma senha temporária' }`. Com empresa: nova `senhaGerada` (substitui a anterior; a senha própria continua valendo) + e-mail `esqueci_senha`. `429` com 5 pedidos por hora por IP + e-mail (toda tentativa conta). |
| `/pedidos` | `POST` | **App** — `autenticar('cliente')` (I13). Body `{ lavaRapidoId, veiculoId, servicoIds[], horario }` (o cliente vem do token; qualquer outro campo — preço, duração, status, clienteId — é ignorado). Validação de formato (`pedidos.validation.ts#validarCriacaoPedido`): ids não vazios, 1 a 20 serviços sem repetição, `horario` ISO 8601 com fuso (`Z`/`±HH:mm`) e data existente → senão `400 DADOS_INVALIDOS`. Depois, numa transação (`pedidos.service.ts#criarPedido`): lava-rápido inexistente → `404 LAVA_RAPIDO_NAO_ENCONTRADO`; veículo inexistente **ou de outro cliente** → `404 VEICULO_NAO_ENCONTRADO`; serviço inexistente, inativo ou de outro lava-rápido → `400 SERVICO_INVALIDO` (+ `servicoIdsInvalidos`); `validarHorarioPedido` (`pedidos.validation.ts`): no passado/agora → `400 HORARIO_PASSADO`; depois (I20) o período `[horario, horario + duracaoMinutos)` vai para `estaAberto` do I19 (duração 0 = só o instante) e, se fechado, `400 HORARIO_INDISPONIVEL` com mensagem por caso em hora de São Paulo (`mensagemHorarioIndisponivel`, função pura): dia fechado "O lava-rápido não abre nesse dia."; começa antes de abrir "Nesse dia o lava-rápido abre às 08:00."; termina depois de fechar "Nesse dia o lava-rápido fecha às 18:00. O atendimento escolhido termina às 18:30."; atravessa a meia-noite "O atendimento escolhido termina só no dia seguinte, às 00:30. Escolha um horário mais cedo."; intercorrência de dia inteiro "O lava-rápido estará fechado nesse dia: <motivo>." ou parcial "… fechado das 14:00 às 16:00 nesse dia: <motivo>." (reaberta não bloqueia). Lava-rápido sem horário cadastrado = sem restrição de horário. Sem conflito/capacidade com outros pedidos. Calcula `precoTotal` (arredondado em centavos) e `duracaoMinutos` (helper `duracaoDoServico` de `servicos.service.ts`) e grava `pendente`. `201` com o pedido completo. Erros sempre `{ error, codigo }`. |
| `/pedidos` | `GET` | **Painel** — `autenticar('lavaRapido')`. Lista os pedidos da empresa do token, mais recentes primeiro, com `cliente { id, nome }`, `veiculo { id, marca, modelo, cor, placa }`, `servicos[] { id, servicoId, nome, preco, duracaoMinutos }`, `precoTotal`, `duracaoMinutos` (I13; `PATCH` devolve o mesmo formato). `?lavaRapidoId=` é **ignorado** (a empresa vem do token). |
| `/pedidos/:id` | `PATCH` | **Painel** — `autenticar('lavaRapido')`. Atualiza **só** o `status` (body `{ status }`); `400` se o status não for um dos 3 válidos, `404` se o pedido não existir **ou for de outra empresa**. |
| `/servicos` | `GET` | **Público** (app do cliente e painel). Lista serviços (combos). Aceita `?lavaRapidoId=` opcional. Cada um vem com `itens: [{ id, nome, categoria, duracaoMinutos }]`, `categorias: string[]` (distintas, derivadas dos itens) e `duracaoMinutos` (soma dos itens). |
| `/servicos` | `POST` | **Painel** — `autenticar('lavaRapido')`. Cria um combo na empresa do token: body `{ nome, preco, itemIds }` (`lavaRapidoId` no body é ignorado). `400` se `nome` vazio/maior que 60, `preco` ≤ 0, `itemIds` vazio/com repetição, ou algum item inexistente/inativo no catálogo (resposta traz `itemIdsInvalidos`); `401` se a empresa do token não existir mais. `201` com o serviço (já com `itens`/`categorias`). |
| `/servicos/:id` | `PUT` | **Painel** — `autenticar('lavaRapido')`. Edita nome, preço e itens (body `{ nome, preco, itemIds }`, mesma validação do `POST`); substitui os itens numa transação. `404` se o serviço não existir **ou for de outra empresa**. Sem `DELETE`: a loja desativa (pedidos antigos guardam o nome). |
| `/servicos/:id` | `PATCH` | **Painel** — `autenticar('lavaRapido')`. Atualiza **só** o `ativo` (body `{ ativo: boolean }`, nenhum outro campo); `400` se o body tiver outra coisa, `404` se o serviço não existir **ou for de outra empresa**. |
| `/itensServico` | `GET` | Catálogo global: itens `ativo: true` (com `duracaoMinutos`), ordenados por categoria e nome. Só leitura — não há rota pra criar/editar item. |
| `/intercorrencias` | `GET` | **Público** (app do cliente e painel). Lista intercorrências. Aceita `?lavaRapidoId=` opcional. |
| `/intercorrencias` | `POST` | **Painel** — `autenticar('lavaRapido')`. Cria uma intercorrência na empresa do token: body `{ data, motivo, diaInteiro, horaInicio?, horaFim? }` (`lavaRapidoId` no body é ignorado); `400` se `horaInicio`/`horaFim` vierem com `diaInteiro: true`, ou faltarem com `diaInteiro: false`; `401` se a empresa do token não existir mais. |
| `/intercorrencias/:id` | `PATCH` | **Painel** — `autenticar('lavaRapido')`. "Reabre" manualmente: body **só** `{ reaberta: true }` (`400` se vier outra coisa); a partir daí essa intercorrência para de contar no cálculo de `isOpen` (ver nota acima). `404` se o id não existir **ou for de outra empresa**. |
| `/veiculos` | `GET` | **Painel** — `autenticar('lavaRapido')`. Lista os `Veiculo`s distintos que têm pedido na empresa do token (relação `Pedido → Veiculo`, I13), `{ id, marca, modelo, cor, placa }`, por modelo/placa; `?lavaRapidoId=` é ignorado. |
| `/auth/cliente/cadastro` | `POST` | Público (I1), com **limite de tentativas** (seção 5.3). Body `{ nome, email, senha }`: nome obrigatório (trim, até 100 caracteres), e-mail obrigatório no formato `^[^\s@]+@[^\s@]+\.[^\s@]+$` (até 254 caracteres), senha com no mínimo 6 caracteres e no máximo 72 bytes em UTF-8 (limite do bcrypt). `400 { error, campos: { nome?, email?, senha? } }`; `409 { error: 'Este e-mail já está cadastrado' }` (sem diferenciar maiúsculas); `201` com o `Cliente` sem `senha`. |
| `/auth/cliente/login` | `POST` | Público (I2), com **limite de tentativas** (seção 5.3). Body `{ email, senha }` (e-mail normalizado). `200 { token, expiraEm, cliente }` (cliente sem `senha`); `401 { error: 'E-mail ou senha incorretos' }` — **mesma** resposta para e-mail inexistente, senha errada ou body incompleto (e o mesmo tempo de resposta: compara com um hash fictício quando o e-mail não existe). |
| `/clientes/me` | `GET` | `autenticar('cliente')` (I2). `200` com o cliente do token (sem `senha`); `401` sem token, com token inválido/expirado ou se o cliente não existir mais; `403` com token de outro tipo. Recursos do cliente logado ficam em `/clientes/me/...` (I3, I13, I18). |
| `/clientes/me/veiculos` | `GET` | `autenticar('cliente')` (I3). Veículos do cliente do token, mais antigo primeiro. |
| `/clientes/me/veiculos` | `POST` | `autenticar('cliente')` (I3). Body `{ marca?, modelo, cor, placa }`: modelo, cor e placa obrigatórios (trim, até 60 caracteres; marca vazia vira `null`), placa no formato antigo ou Mercosul (normalizada antes de salvar). `400 { error, campos: { marca?, modelo?, cor?, placa? } }`; `409` se o cliente já tiver essa placa (`P2002`); `201` com o veículo. |
| `/clientes/me/veiculos/:id` | `PUT` | `autenticar('cliente')` (I3). Mesmo body/validação do `POST`. `200` com o veículo; `404` se não existir ou for de outro cliente; `409` se outro veículo do cliente já tiver a placa. |
| `/clientes/me/veiculos/:id` | `DELETE` | `autenticar('cliente')` (I3). `204`; `404` se não existir ou for de outro cliente; `409` se o veículo já tiver pedido (I13). |
| `/clientes/me/pedidos` | `GET` | `autenticar('cliente')` (I18). Só os pedidos do cliente do token, por `horario` crescente. Cada um: `status`, `horario`, `precoTotal`, `duracaoMinutos`, `criadoEm`, `statusAlteradoEm`, `motivoRecusa`, `recusaVistaEm`, `lavaRapido { id, nome, endereco }`, `veiculo`, `servicos[] { nome, preco, ... }` e `quando` (`proximo` \| `anterior`, de `classificarPedido`: `proximo` se `horario >= agora` e o status não é `recusado` nem `concluido`). Sem `fotos`. |
| `/clientes/me/pedidos/:id` | `GET` | `autenticar('cliente')` (I18). Mesmo formato; `404 { error, codigo: 'PEDIDO_NAO_ENCONTRADO' }` se não existir ou for de outro cliente. |
| `/clientes/me/pedidos/:id/visto` | `POST` | `autenticar('cliente')` (I18). Preenche `recusaVistaEm` se o pedido for `recusado` e ainda não visto (idempotente; outros status não mudam). `204`; `404` se for de outro cliente. O app chama ao abrir o detalhe de um recusado. |
| `/clientes/me/notificacoes` | `GET` | `autenticar('cliente')` (I18). `{ recusasNaoVistas }`: pedidos do cliente com `status = recusado` e `recusaVistaEm = null` (badge do botão de conta no app). |
| `/contratos/vigente` | `GET` | Contrato vigente do onboarding (maior `versao` com `vigente: true`); `404` se não houver. |
| `/onboarding/solicitacoes` | `POST` | Público. Body `{ name, address?, cnpj, email, senha }` (I17). `400` se `name` faltar, `cnpj` não tiver 14 dígitos, `email` faltar/for inválido (mesmo formato do cliente, até 254) ou `senha` tiver menos de 8 caracteres (ou mais de 72 bytes); `409` se o `cnpj` **ou o e-mail** (normalizado) já for de um `LavaRapido`; se já houver uma `aguardando_contrato` com o mesmo `cnpj`: com e-mail e senha (I17), `200` devolvendo a mesma solicitação (retomar, com nome/endereço deste envio) **só se o e-mail e a senha conferem** — senão `409` ("solicitação de cadastro em andamento"), sem trocar as credenciais nem devolver o `id` (o CNPJ é público: sobrescrever deixaria qualquer um trocar a senha da empresa em cadastro); sem senha (anterior ao I17), `200` completando-a com o e-mail e a senha deste envio; com **limite de tentativas** (seção 5.3, só as recusas contam); `503` se não houver contrato vigente; senão `201` com a solicitação (`status: aguardando_contrato`, `email`) + `contrato: { id, versao, titulo, conteudo }`. A senha é gravada **só como hash bcrypt** em `SolicitacaoOnboarding.senhaHash`, que nunca sai na resposta. |
| `/onboarding/solicitacoes/:id` | `GET` | Status + contrato da solicitação; `404` se não existir. |
| `/onboarding/solicitacoes/:id/aceite` | `POST` | Body `{ aceite: "eu aceito" }` (trim, case-insensitive; senão `400`). Numa transação: cria o `LavaRapido` com o `email` e o `senhaHash` da solicitação e marca a solicitação `concluida` + `aceitoEm` + `lavaRapidoId`. `201 { token, expiraEm, lavaRapido }` (mesma sessão do login — o painel já entra); `404` se não existir; `409` se já concluída, se a solicitação é anterior ao I17 (sem e-mail/senha — reenviar o cadastro completa a mesma solicitação) ou se o CNPJ/e-mail foi cadastrado por outro caminho nesse meio-tempo. |

**`POST /lavaRapidos` e `DELETE /lavaRapidos/:id` foram removidos no I17** (respondem `404`): empresa nova só pelo fluxo `/onboarding`; a exclusão passa a ser por solicitação, processada por interno com permissão `admin` (seção 5.4). O cascade do banco (`onDelete: Cascade` em `Pedido`/`Servico`/`Intercorrencia`/`HorarioFuncionamento`) continua.

**Desvio da decisão original do plano**: o plano previa uma rota específica `PATCH /pedidos/:id/status`. Na implementação, isso quebraria com o `pedidos.routes.js` do admin-front (que já usa `PATCH /pedidos/:id` genérico) e com o `json-server` de fallback (que não suporta sub-rotas customizadas — não tem `--routes`/rewrite nessa versão). Mantida `PATCH /pedidos/:id`, com a mesma segurança pretendida (só `status` é aceito, qualquer outro campo no body é ignorado) garantida na validação do controller, não na URL. Isso preserva o critério "zero mudança de código além da `BASE_URL`" nos dois front-ends.

**`PATCH /pedidos/:id` — aceite/recusa e fluxo de status (I15, `docs/plan/i15-aceite-recusa-pedido/`).** Body `{ status, motivo? }` (outros campos ignorados). Só as transições de `TRANSICOES` (`src/modules/pedidos/pedidoStatus.ts`, lógica pura com `podeTransicionar`/`mensagemTransicaoInvalida`/`validarAtualizacaoStatus`): `pendente → aceito | recusado`, `aceito → em_andamento`, `em_andamento → concluido`; `recusado` e `concluido` são finais. Erros no formato `{ error, codigo }`: `400 DADOS_INVALIDOS` (status inexistente; `motivo` fora de `recusado`, não-texto ou com mais de 200 caracteres após `trim`), `404 PEDIDO_NAO_ENCONTRADO` (inexistente ou de outra empresa — a empresa vem do token), `409 TRANSICAO_INVALIDA` (ex.: "Não é possível mudar de recusado para aceito."; mesmo status → "O pedido já está aceito."). No sucesso grava `statusAlteradoEm = agora` e `motivoRecusa` (só em `recusado`; motivo vazio vira `null`) e devolve o pedido no formato do `GET`. Concorrência: o `updateMany` filtra também pelo status lido, então dois cliques simultâneos ("Aceitar" e "Recusar") não passam os dois — o segundo recebe `409`. `GET /pedidos` e o `PATCH` expõem `statusAlteradoEm` e `motivoRecusa` (consumidos pelo I18). Migration `20261017150000_aceite_recusa_pedido` (só `ADD VALUE` + colunas; pedidos existentes ficam com `statusAlteradoEm = null`). Seed/demo: exemplos `aceito` e `recusado` (com motivo); pedido de exemplo fora de `pendente` ganha `statusAlteradoEm = horario`.

As 3 telas `Serviços`/`Disponibilidade`/`Veículos` do admin-front usam este backend real desde `migrar-servicos-disponibilidade-veiculos-backend` (ver `admin-front.specs.md` seção 8) — o `json-server` próprio delas continua existindo só como fallback manual, mesmo padrão já adotado pra `/pedidos`. `POST /pedidos` existe desde o I13 (app do cliente). Autenticação: ver seção 5.2.

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

- **Token**: JWT **HS256** (`jsonwebtoken`), segredo em `JWT_SECRET` (obrigatório, **mínimo 32 caracteres** — `server.ts` chama `garantirConfiguracaoDoToken()` e não sobe sem ele, com ele curto ou com `JWT_EXPIRES_IN` inválido; nunca no código), validade `JWT_EXPIRES_IN` (padrão `7d`). Nos testes, `vitest.config.ts` define um segredo fixo de teste.
- **Payload**: `{ sub: <id>, tipo: 'cliente' | 'lavaRapido' | 'interno', permissoes?: string[], escopo?: string }`. `permissoes` só para `interno` (ex.: `['admin']`); `escopo` marca token de uso restrito (ex.: `'trocar-senha'`, i17-senha-gerada).
- **`src/auth/token.ts`**:
  - `assinarToken({ id, tipo, permissoes?, escopo? }): string`
  - `verificarToken(token): Autenticacao` — `{ id, tipo, permissoes, escopo? }` (`permissoes` vira `[]` quando ausente); lança erro se o token for inválido, expirado, assinado com outro segredo/algoritmo (inclusive `alg: none`) ou com payload fora do contrato (sem `sub`, sem `exp`, `tipo` desconhecido, `permissoes`/`escopo` mal formados).
  - `expiracaoDoToken(token): string` (ISO) e `garantirConfiguracaoDoToken()`.
- **`src/auth/types.ts`**: `TIPOS_USUARIO`, `TipoUsuario`, `Autenticacao` e a tipagem global `Express.Request['auth']`.
- **`src/middlewares/autenticar.ts`** — `autenticar(...tipos: TipoUsuario[])` (**autenticação**: quem é). Lê `Authorization: Bearer <token>`:
  - sem header/esquema `Bearer`, token inválido ou expirado → **`401 { error }`**;
  - token válido de um tipo fora de `tipos` → **`403 { error }`**;
  - token com `escopo` (uso restrito) → **`403 { error }`** — `autenticarAceitandoEscopo('trocar-senha', 'lavaRapido')` (i17-senha-gerada) libera esse escopo só na rota de troca (`POST /auth/lava-rapido/trocar-senha`);
  - ok → `req.auth = { id, tipo, permissoes, escopo? }` e `next()`.
  - Chamar sem nenhum tipo lança erro na montagem da rota. Uso: `router.get('/me', autenticar('cliente'), asyncHandler(me))`; o I17 usa `autenticar('lavaRapido')` e `autenticar('interno')`.
- **Permissão** fica separada (**autorização**: o que pode): `autorizar(...permissoes)` (`src/middlewares/autorizar.ts`, i17-interno-exclusao), montado **depois** de `autenticar`. Confere `req.auth.permissoes` (vindas do token): falta alguma das permissões pedidas (todas são exigidas) → **`403 { error: 'Permissão insuficiente para esta ação' }`**; sem `req.auth` (rota montada sem `autenticar` antes) → `401`. Chamar sem nenhuma permissão lança erro na montagem. Uso: `router.use(autenticar('interno'), autorizar('admin'))`. Ver seção 5.4.
- **Painel (I17, `docs/plan/i17-acesso-seguro-painel/`)**: `POST /lavaRapidos/login` e o aceite do onboarding devolvem `{ token, expiraEm, lavaRapido }` com token `tipo: 'lavaRapido'`. Rotas de gestão com `autenticar('lavaRapido')`: `GET /pedidos`, `PATCH /pedidos/:id`, `POST /servicos`, `PUT/PATCH /servicos/:id`, `POST /intercorrencias`, `PATCH /intercorrencias/:id`, `GET /veiculos` — `PUT /lavaRapidos/:id/horarios` (I19 parte 2; `:id` tem de ser a empresa do token) e toda rota de gestão nova. **A empresa vem do token** (`req.auth.id`); `?lavaRapidoId=`/`body.lavaRapidoId` são ignorados. **Isolamento:** os services filtram por `{ id, lavaRapidoId }` — recurso de outra empresa = `404` (nunca `403`, pra não confirmar que existe). Token de cliente no painel = `403`; token de lava-rápido em rota de cliente = `403`.
- **Rotas públicas (sem token):** `GET /lavaRapidos`, `GET /lavaRapidos/:id`, `GET /lavaRapidos/:id/horarios`, `POST /lavaRapidos/login`, `GET /servicos?lavaRapidoId=`, `GET /itensServico`, `GET /intercorrencias?lavaRapidoId=` (leituras do app do cliente), `/auth/cliente/cadastro`, `/auth/cliente/login`, `POST /auth/interno/login`, `POST /auth/lava-rapido/esqueci-senha`, `/onboarding/*`, `GET /contratos/vigente`, `/api-docs`.
- Testes: `src/test/authPainel.test.ts` (sem token, token de cliente, token de outra empresa, rotas públicas); helper `tokenDeLavaRapido(lavaRapido)`.

## 5.3 Limite de tentativas (login e cadastro)

Decisão de 2026-10-10 (I17). `src/middlewares/limiteTentativas.ts` (`express-rate-limit`), registrado em `app.ts` antes dos routers, um contador por rota: `POST /auth/cliente/login`, `POST /lavaRapidos/login`, `POST /auth/cliente/cadastro`, `POST /onboarding/solicitacoes` (retomar uma solicitação pendente confere e-mail + senha) e `POST /auth/interno/login` (i17-interno-exclusao, chave por e-mail, só falhas contam).

- **Chave** = IP + o campo do body que identifica a conta **naquela rota** (`identificador`: `email` — normalizado com `utils/email.ts#normalizarEmail` — nos logins/cadastro do cliente; `cnpj` só com dígitos no login do lava-rápido e no onboarding); sem o campo, só o IP. Só o campo da rota entra na chave: um `email` extra no login por CNPJ não abre um contador novo. Estourar o limite de um e-mail/CNPJ não bloqueia outro.
- **Logins/onboarding: só as falhas contam** (`soFalhasContam`); no cadastro do cliente, toda tentativa conta.
- **Limite**: `LIMITE_TENTATIVAS` (padrão `10`) por janela de `LIMITE_TENTATIVAS_JANELA_MINUTOS` (padrão `15`).
- **Estourou** → `429 { error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' }` + header `Retry-After` (cabeçalhos `RateLimit` draft-7). O painel e o app mostram a mensagem do `error`.
- **Limitações**: contagem **em memória** — vale por instância do backend (várias instâncias = contadores separados; reinício zera). Sem `trust proxy`: atrás de proxy reverso o IP visto seria o do proxy (configurar `app.set('trust proxy', …)` no deploy).
- **Senha do painel** (i17-senha-gerada): `POST /auth/lava-rapido/esqueci-senha` tem limite próprio — **5 por hora** por IP + e-mail, toda tentativa conta (`LIMITE_ESQUECI_SENHA`, `LIMITE_ESQUECI_SENHA_JANELA_MINUTOS`; `createApp({ limiteEsqueciSenha })`), pra não virar disparador de e-mails. `POST /auth/lava-rapido/trocar-senha` usa o limite padrão, só falhas, com `identificador: 'nenhum'` (chave só o IP — a rota é autenticada e não tem campo de conta no body).
- **Testes**: `vitest.config.ts` define `LIMITE_TENTATIVAS=10000` pra não interferir nos outros testes; `src/test/limiteTentativas.test.ts` cria o app com `createApp({ limiteTentativas: { limite: 3, janelaMinutos: 15 } })` e estoura o limite.

## 5.4 Usuários internos e exclusão de empresa por solicitação

Plano `docs/plan/i17-interno-exclusao/`. **A empresa só solicita a exclusão; quem exclui é um usuário interno (equipe WashAway) com a permissão `admin`, ao aprovar** — com registro e decisão humana, como o onboarding.

**Modelos** (migration `20261017140000_interno_exclusao`):
- `UsuarioInterno { id, nome, email @unique (normalizado), senha (hash bcrypt), permissoes String[], criadoEm }`. Criado **só** por script/seed/demo — não há rota de cadastro.
- `SolicitacaoExclusao { id, lavaRapidoId?, nome, cnpj, email?, motivo?, status: pendente | aprovada | recusada | cancelada, criadoEm, decididoEm?, decididoPorId?, observacao? }`. `nome`/`cnpj`/`email` são **snapshot** da empresa: o registro sobrevive à exclusão (`lavaRapidoId` vira `null`, `onDelete: SetNull`). `decididoPorId` → `UsuarioInterno` (`SetNull`).
- `TipoEventoEmail` + `exclusao_solicitada`, `exclusao_aprovada`, `exclusao_recusada`.

**Rotas** (`src/modules/internos/`, `src/modules/exclusoes/`):

| Rota | Método | Descrição |
|---|---|---|
| `/auth/interno/login` | `POST` | Público, com limite de tentativas (5.3). Body `{ email, senha }`. `200 { token, expiraEm, interno }` — token `tipo: 'interno'` com as `permissoes` do banco no momento do login; `401 { error: 'E-mail ou senha incorretos' }` igual para e-mail inexistente, senha errada ou body incompleto (mesmo tempo de resposta). |
| `/lavaRapidos/me/solicitacao-exclusao` | `POST` | `autenticar('lavaRapido')`. Body `{ motivo? }` (texto até 500, aparado; vazio = `null`; outro tipo/longo → `400`). Cria a pendente (`201`) com o snapshot e enfileira `exclusao_solicitada`; se já houver uma pendente, devolve a mesma (`200`, sem novo e-mail). A checagem trava a linha do `LavaRapido` (`SELECT … FOR UPDATE`), então requisições simultâneas não criam duas pendentes. `401` se a empresa do token não existir mais. |
| `/lavaRapidos/me/solicitacao-exclusao` | `GET` | `autenticar('lavaRapido')`. A solicitação **mais recente** da empresa, em qualquer status (o painel mostra pendente, recusada ou cancelada); `404` se nunca houve. |
| `/lavaRapidos/me/solicitacao-exclusao` | `DELETE` | `autenticar('lavaRapido')`. Cancela a pendente → `200` com `status: cancelada` (+ `decididoEm`); `404` se não houver pendente. Cancelar não gera e-mail. |
| `/interno/solicitacoes-exclusao` | `GET` | `autenticar('interno')` + `autorizar('admin')`. Lista, mais antigas primeiro; `?status=` opcional (`400` se inválido). |
| `/interno/solicitacoes-exclusao/:id/aprovar` | `POST` | Interno `admin`. Numa transação: `pendente` → `aprovada` (`decididoEm`, `decididoPorId`), enfileira `exclusao_aprovada` e **exclui o `LavaRapido`** (a cascata apaga pedidos, serviços, intercorrências e horários). `200` com a solicitação (`lavaRapidoId: null`). `404` inexistente; `409` se não estiver mais pendente (decisão dupla ou concorrente — a troca de status é um `updateMany where status = pendente`). |
| `/interno/solicitacoes-exclusao/:id/recusar` | `POST` | Interno `admin`. Body `{ observacao? }` (mesmas regras do `motivo`). `pendente` → `recusada`, grava a observação e enfileira `exclusao_recusada`; a empresa continua e pode solicitar de novo. `404`/`409` como no aprovar. |

- **401 × 403 nas rotas internas:** sem token ou token inválido → `401`; token de lava-rápido ou cliente → `403` (tipo errado, `autenticar`); interno sem `admin` → `403` (`autorizar`). Aprovar/recusar com token de um interno que não existe mais → `401 "Sessão inválida"` (é ele quem vai em `decididoPorId`). As permissões valem pelo que estava no token: tirar a permissão no banco só vale no próximo login (o token dura `JWT_EXPIRES_IN`).
- **E-mails** (via `enfileirarEmail`, mesma transação): para o `email` do snapshot. Empresa sem e-mail (anterior ao I17) segue o fluxo sem e-mail.
- **Criar um interno:** `npm run interno:criar -- --email ana@washaway.dev --permissoes admin [--nome "Ana"] [--senha "..."]` (`prisma/criarUsuarioInterno.ts`). Sem `--senha`, gera uma aleatória e mostra uma vez; e-mail já cadastrado → recusa. Em dev, `npm run prisma:demo` (e o `seed.ts`) criam **`dev@washaway.dev` / `demo1234`** com `admin` (`prisma/internoExemplo.ts`, só se não existir) — credencial só de desenvolvimento.
- **Operar pelo Swagger (sem tela interna nesta sprint):**
  1. Abrir `http://localhost:4000/api-docs` → `POST /auth/interno/login` → "Try it out" com `{ "email": "dev@washaway.dev", "senha": "demo1234" }` → copiar o `token`.
  2. Botão **Authorize** (cadeado) → colar o token (sem o prefixo `Bearer`).
  3. `GET /interno/solicitacoes-exclusao?status=pendente` → anotar o `id`.
  4. `POST /interno/solicitacoes-exclusao/{id}/aprovar` (exclui a empresa de vez) ou `/recusar` com `{ "observacao": "..." }`.
- **Testes:** `src/test/internos.test.ts` (login, `401` genérico, sem rota de cadastro, `autorizar`) e `src/test/exclusoes.test.ts` (401/403 em todas as rotas, uma pendente só — inclusive em paralelo, cancelar, aprovar exclui com cascata e mantém o snapshot, recusar mantém a empresa, e-mails de cada etapa, rotas legadas `404`). Helpers `tokenDeInterno(permissoes, interno?)` e `criarUsuarioInternoTeste()`.

## 5.5 Senha gerada, troca obrigatória e "esqueci minha senha"

Plano `docs/plan/i17-senha-gerada/`. Um mecanismo só — **senha temporária por e-mail + troca obrigatória** — para o onboarding, a recuperação de senha e a troca em massa. Código em `src/modules/lava-rapidos/senhas.{service,controller,routes}.ts`.

- **`LavaRapido.senhaGerada`** (hash bcrypt, `null` = sem senha temporária). A senha temporária tem 10 caracteres (`crypto.randomInt`, sem `0/O/o/1/l/I`) e só existe em texto puro no corpo do e-mail (o worker mascara depois de enviar; seção 5.1).
- **Login** (`autenticarLavaRapido`): compara primeiro com a `senha` (certa → login normal e `senhaGerada = null`), depois com a `senhaGerada` (certa → `trocaDeSenhaObrigatoria: true` + token de escopo **`trocar-senha`** com validade de **15 min**). O token de troca leva `403` em qualquer outra rota (`autenticar`), e só vale enquanto a `senhaGerada` existir (depois da troca → `401`).
- **Quando se gera** (`definirSenhaGerada(tx, empresa, motivo)`, sempre na mesma transação que enfileira o e-mail):
  1. **aceite do onboarding** (`onboarding.service#aceitarContrato`) — e-mail `senha_gerada`; a empresa entra com a senha própria **ou** com a gerada;
  2. **"esqueci minha senha"** (`POST /auth/lava-rapido/esqueci-senha`) — e-mail `esqueci_senha`; substitui a gerada anterior, não mexe na senha própria; resposta sempre igual;
  3. **troca em massa** (`gerarSenhasEmMassa(filtro, { invalidarSenhaAtual })`) — e-mail `senha_gerada`, uma transação por empresa; empresa sem e-mail recebe em `cnpj-<cnpj>@washaway.dev` (**só dev**, não é gravado em `LavaRapido.email`). Nesta sprint só o script chama.
- **Script** `prisma/trocaSenhaEmMassa.ts` (`npm run senhas:troca-em-massa`, função `trocarSenhasPadraoAdmin`): para cada empresa cuja `senha` ainda confere com `"admin"`, troca a `senha` por um hash aleatório (ninguém conhece), gera a `senhaGerada` e enfileira o e-mail. **Rodar uma vez** no banco de dev depois do deploy do I17 (e subir o worker para os e-mails irem para `.emails/`). Idempotente (quem já não tem `admin` fica de fora), não apaga nada, só mexe nas colunas de senha.
- **Tipos de e-mail**: `TipoEventoEmail.senha_gerada` e `esqueci_senha`.
- **Testes**: `src/test/senhas.test.ts` (login com senha própria zera a gerada; login com a gerada → troca obrigatória e `403` nas rotas de gestão; troca zera a gerada e a senha antiga deixa de valer; token de troca não serve duas vezes; esqueci com e-mail existente/inexistente; `429`; aceite do onboarding; troca em massa idempotente), `autenticar.test.ts` (`autenticarAceitandoEscopo`).

## 6. Organização de pastas

```
backend/
├── docker-compose.yml
├── .env.example                     # DATABASE_URL, TEST_DATABASE_URL, PORT, JWT_SECRET, JWT_EXPIRES_IN, EMAIL_*
├── prisma/
│   ├── schema.prisma
│   ├── migrations/                  # geradas por `prisma migrate dev`
│   ├── seed.ts                      # DESTRUTIVO: apaga tudo e recria os dados de exemplo
│   ├── demo.ts                      # dados de apresentação (npm run prisma:demo) — só insere, idempotente por CNPJ
│   └── trocaSenhaEmMassa.ts         # i17-senha-gerada: tira a senha "admin" das empresas antigas (npm run senhas:troca-em-massa)
├── src/
│   ├── app.ts                       # createApp() — monta o Express, sem dar listen
│   ├── server.ts                    # importa createApp() e sobe na porta 4000
│   ├── config/
│   │   └── prisma.ts                # PrismaClient singleton
│   ├── auth/
│   │   ├── senha.ts                 # gerarHashSenha / conferirSenha (bcrypt + hash fictício: mesmo tempo sem conta)
│   │   ├── token.ts                 # assinarToken / verificarToken (JWT HS256) — seção 5.2
│   │   └── types.ts                 # TipoUsuario, Autenticacao, req.auth
│   ├── middlewares/
│   │   ├── asyncHandler.ts
│   │   ├── autenticar.ts            # autenticar(...tipos) → req.auth; 401/403
│   │   └── limiteTentativas.ts      # I17: express-rate-limit nos logins/cadastro/onboarding → 429
│   ├── docs/
│   │   └── openapi.ts                # documento OpenAPI 3.0 (objeto TS, escrito à mão) servido em /api-docs
│   ├── modules/
│   │   ├── lava-rapidos/{lavaRapidos.routes,controller,service}.ts
│   │   ├── lava-rapidos/senhas.{routes,controller,service}.ts  # i17-senha-gerada: /auth/lava-rapido/*, senha gerada, troca em massa
│   │   ├── clientes/{clientes.routes,controller,service,validation}.ts  # I1/I2: /auth/cliente/{cadastro,login}, /clientes/me
│   │   ├── veiculos-cliente/{veiculosCliente.routes,controller,service,validation}.ts + placa.ts  # I3: /clientes/me/veiculos (aninhado no clientesRouter)
│   │   ├── pedidos-cliente/{pedidosCliente.routes,controller,service}.ts + classificarPedido.ts  # I18: /clientes/me/pedidos e /clientes/me/notificacoes (aninhados no clientesRouter)
│   │   ├── contratos/{contratos.routes,controller,service}.ts       # "BackEnd Onboard": contrato vigente
│   │   ├── onboarding/{onboarding.routes,controller,service,validation}.ts  # solicitação → aceite → cria LavaRapido
│   │   ├── pedidos/{pedidos.routes,controller,service,validation}.ts   # POST (cliente) + GET/PATCH (painel)
│   │   ├── servicos/{servicos.routes,controller,service,validation}.ts
│   │   ├── itens-servico/{itensServico.routes,controller,service}.ts   # catálogo global, só leitura
│   │   ├── intercorrencias/{intercorrencias.routes,controller,service,validation}.ts
│   │   ├── email/email.service.ts   # enfileirarEmail — outbox de e-mail (seção 5.1)
│   │   ├── horarios/{horarios.routes,controller,service,validation}.ts + disponibilidade.service.ts  # I19: horário semanal (GET público, PUT do painel) + estaAberto/listarAbertos
│   │   └── veiculos/{veiculos.routes,controller,service}.ts   # painel: Veiculos dos pedidos da empresa
│   ├── utils/
│   │   ├── email.ts                 # normalizarEmail, FORMATO_EMAIL, EMAIL_MAXIMO (cliente, lava-rápido, limite de tentativas)
│   │   ├── fusoHorario.ts           # FUSO_LAVA_RAPIDOS + partesLocais (I19)
│   │   ├── prismaErros.ts           # isViolacaoDeUnicidade (P2002 → 409 nos controllers)
│   │   └── queryParam.ts            # getStringQueryParam — normaliza ?lavaRapidoId= (string ou array), usado por todos os módulos acima
│   └── test/
│       ├── globalSetup.ts           # docker compose up (fora do CI) + cria/migra washaway_test_1..N (um por worker)
│       ├── setupBancoDoWorker.ts    # setupFiles: DATABASE_URL = banco do worker (VITEST_POOL_ID)
│       ├── testDatabaseUrl.ts       # TEST_DATABASE_URL base + nome/URL do banco de cada worker
│       ├── helpers/                 # factories.ts, limpeza.ts, auth.ts (ver seção 6.1)
│       ├── lavaRapidos.test.ts
│       ├── pedidos.test.ts
│       ├── pedidosPontaAPonta.test.ts   # I13: cadastro → login → veículo → POST /pedidos → painel certo
│       ├── servicos.test.ts
│       ├── itensServico.test.ts
│       ├── intercorrencias.test.ts
│       ├── veiculos.test.ts
│       ├── contratos.test.ts
│       ├── onboarding.test.ts
│       ├── clientes.test.ts         # I1: cadastro
│       ├── clientesAuth.test.ts     # I2: login, /clientes/me, token expirado/inválido
│       ├── veiculosCliente.test.ts  # I3: CRUD /clientes/me/veiculos, placa, 409, 404 de outro cliente, 401
│       ├── pedidosCliente.test.ts   # I18: isolamento entre clientes, 404 do pedido alheio, 401/403, ordenação, recusas não vistas
│       ├── autenticar.test.ts       # contrato do middleware (401 × 403, escopo, vários tipos)
│       ├── authPainel.test.ts       # I17: rotas de gestão sem token/token de cliente/outra empresa; públicas
│       ├── limiteTentativas.test.ts # I17: 429 nos logins e no cadastro do cliente
│       ├── senhas.test.ts           # i17-senha-gerada: login com senha gerada, troca, esqueci, onboarding, troca em massa
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
- `factories.ts` — `criarLavaRapidoTeste(overrides)` (com `senha` em texto puro opcional, gravada com bcrypt), `criarItemServicoTeste`, `criarServicoTeste(lavaRapidoId, { itemIds })`, `criarPedidoTeste(lavaRapidoId, overrides)` (formato do I13: sem `clienteId`/`veiculoId` cria cliente e veículo de teste; um item "Lavagem de teste" R$ 50/30 min; pedidos criados via `POST /pedidos` no teste precisam ser apagados antes do cliente/veículo, por causa do `Restrict`), `criarClienteTeste(overrides)` (I1; `senha` em texto puro opcional — padrão `SENHA_CLIENTE_TESTE` —, gravada com bcrypt; e-mail único), mais `cnpjUnico()`, `placaUnica()`, `sufixoUnico()`. Cada factory registra o id criado para limpeza. `criarVeiculoTeste(clienteId, overrides)` (I3; placa Mercosul única).
- `limpeza.ts` — `limparDadosDeTeste()` apaga só o que as factories (ou `registrarParaLimpeza(modelo, id)`) registraram neste arquivo, na ordem certa. Nada de `deleteMany` global.
- `auth.ts` — `comToken(req, token)` (header `Authorization: Bearer`); `tokenDeCliente(cliente)` gera o token direto com `assinarToken` (sem passar pela rota de login); `tokenDeLavaRapido(lavaRapido)` gera o token de lava-rápido (I17) do mesmo jeito.
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

`Servico` e `Veiculo` (que apareciam aqui antes) já existem — `Servico` como model Prisma real; `Veiculo` como model do **cliente do app** (I3), ligado ao pedido desde o I13.

- **Autenticação**: token (JWT) do cliente e do lava-rápido e rotas de gestão protegidas existem (seções 5.2 e 5.3). Senha gerada, troca obrigatória, "esqueci minha senha" e o script de troca em massa existem (seção 5.5). Faltam: refresh token/revogação (o token normal emitido antes de uma troca de senha continua valendo até expirar), expiração da `senhaGerada` por tempo, disparo da troca em massa pela interface/por região. Usuários internos e exclusão por solicitação existem (seção 5.4); falta tela interna (hoje só pelo Swagger) e gestão de internos fora do script.
- **Upload de fotos do veículo**: `Pedido.fotos` continua array de URLs estáticas — sem endpoint de upload nem storage.
- **Pedido**: vários serviços por pedido e `POST /pedidos` existem desde o I13. O backend já recusa horário fora do funcionamento/intercorrência (I20); falta no app o retorno ao passo de data e hora e o horário do dia no seletor. "Meus pedidos" do cliente existe desde o I18 (`/clientes/me/pedidos`). Faltam cancelamento pelo cliente, notificação push e capacidade (vários carros no mesmo horário).
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
