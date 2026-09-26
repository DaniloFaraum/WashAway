# admin-front — Spec

> Documento de referência técnica do `admin-front`, no padrão spec-driven development: descreve o que o projeto é, como ele é organizado e quais convenções valem para qualquer trabalho novo nele. Antes de implementar uma feature nova neste projeto, ler este documento primeiro. Ele é atualizado conforme decisões arquiteturais são tomadas (ver "Log de decisões" no final); PRs/tasks que mudam convenção devem atualizar este arquivo.

## 1. Visão geral

`admin-front` é a interface administrativa web do lava-rápido (persona "Dono do lava-rápido" — ver `WashAway/README.md`). O consumidor final usa um app mobile (fora deste repositório/escopo); este projeto atende só quem opera o lava-rápido.

- **Por quê existe**: a persona "Dono do lava-rápido" tem "equipe pequena, muitos contatos dispersos e pouco confiáveis" e "necessita de um bom intermediário" — o admin-front centraliza a operação (pedidos, serviços, disponibilidade, veículos) num único lugar.
- **Quem usa**: o dono/operador do lava-rápido. Não é usado pelo consumidor final.
- **Como se relaciona com o resto do sistema**: consome um back-end HTTP (hoje inexistente — ver seção 5) que por sua vez é a mesma API usada pelo app mobile do consumidor.

## 2. Escopo

Funcionalidades previstas para o admin-front (algumas ainda não implementadas — ver seção 8 para status por página):
- Cadastro/gestão de serviços prestados, categorias e preços.
- Gestão de disponibilidade do lava-rápido.
- Visualização de pedidos recebidos dos consumidores (painel de pedidos).
- Visualização das fotos do veículo enviadas pelo consumidor (estado de limpeza).
- Seleção/gestão de veículos cadastrados pelos consumidores.
- Intermediação de contatos (centralizar o que hoje é disperso).

Fora do escopo do admin-front:
- Qualquer fluxo do consumidor final (isso é o app mobile, outro projeto).
- Autenticação real (JWT, expiração de sessão, troca/recuperação de senha) — existe um login simples (CNPJ + senha fixa, ver seção 4.2), mas é proposital e não é o modelo final.
- Back-end real — ver seção 5, cobre só `pedidos`/`lava-rapidos`, o resto continua simulado.

## 3. Stack e ferramental

- **React** com **Vite** (template `react`, JSX puro — sem TypeScript).
- **Material UI** (`@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`) como biblioteca de componentes. Usar componentes MUI em vez de CSS/HTML cru sempre que houver um componente equivalente.
- **react-router-dom** para roteamento entre páginas.
- **@mui/x-date-pickers** + **dayjs** (adapter) — só para a visão de calendário (`DateCalendar`) da página Disponibilidade.
- **Vitest** como test runner (`npm run test` / `python3 scripts/test.py`).
- **json-server** como back-end simulado (dev e testes) — ver seção 5.
- **Node v24.18.0 / npm 11.16.0** (gerenciador de pacotes: npm; não usar yarn/pnpm neste projeto).
- **oxlint** para lint (script `npm run lint`, configuração padrão do Vite).

Scripts de repositório (`washaway/scripts/`, não confundir com os scripts npm dentro de `admin-front/`):
- `python3 scripts/run.py [-- <args>]` — sobe o dev server (`npm run dev`).
- `python3 scripts/build.py` — roda o build de produção.
- `python3 scripts/test.py [caminhos...]` — roda a suíte de testes, repassando caminhos opcionais.
- `python3 scripts/diff.py --branch <branch> [--ignore-ext ext,ext] [--only-ext ext,ext]` — diff do repo `WashAway/` contra uma branch, com filtro de extensão.

Scripts npm relevantes dentro de `admin-front/`:
- `npm run dev` / `npm run build` / `npm run test` / `npm run lint`.
- `npm run mock-server` — sobe o `json-server` local (porta 3001) para desenvolvimento manual, servindo `mock-server/db.json`.

### 3.1 Como rodar

1. `cd admin-front && npm install` (só na primeira vez, ou quando `package.json` mudar).
2. Suba o back-end de verdade (`WashAway/backend/`, ver `backend.specs.md`) em `http://localhost:4000` — é o padrão agora. Se preferir o `json-server` antigo como fallback manual, rode `npm run mock-server` (porta 3001) e defina `VITE_API_BASE_URL=http://localhost:3001`.
3. Em outro terminal (a partir da raiz do repo `washaway/`): `python3 scripts/run.py` (ou `cd admin-front && npm run dev`) — sobe o front em `http://localhost:5173`.
4. Abrir `http://localhost:5173` no navegador. Sem o passo 2 (algum back-end no ar em `BASE_URL`), nem o login carrega (erro de rede). A tela inicial agora é sempre o login (seção 4.2) — sem uma empresa cadastrada no backend, use a aba "Cadastrar" (nome, CEP + número — endereço autopreenchido pela ViaCEP, ver seção 4.2 — + CNPJ, 14 dígitos); a senha é sempre `admin`.

### 3.2 Como testar

- `python3 scripts/test.py` (a partir da raiz do repo) ou `cd admin-front && npm run test` — roda a suíte Vitest. Sobe e derruba sozinho um `json-server` de teste (porta separada da de dev, via `globalSetup` — ver seção 9); não precisa do passo manual do `mock-server`.
- `python3 scripts/build.py` (ou `npm run build`) — valida que o build de produção não quebra; não substitui os testes, mas pega erros de sintaxe/import que os testes atuais não cobrem (cobertura ainda parcial — ver seção 9).

## 4. Organização de pastas — convenção obrigatória

O admin-front é organizado **por página**, não por camada técnica global. Essa é a convenção vigente (decidida e confirmada explicitamente pelo usuário — ver Log de decisões) e deve ser seguida por qualquer página nova.

```
src/
├── config/
│   └── featureFlags.js          # feature flags do projeto inteiro (ver seção 7)
├── components/                  # SÓ componentes reaproveitados por 2+ páginas
│   └── layout/                  # shell da aplicação — ver seção 4.1
│       ├── AppShell.jsx
│       ├── Sidebar.jsx
│       └── PageHeader.jsx
├── login/                        # login/sessão da empresa (CNPJ+senha) — ver seção 4.2
│   ├── Login.jsx
│   ├── sessao.storage.js
│   ├── useSessaoEmpresa.js
│   └── service/
│       ├── lavaRapidos.routes.js
│       ├── lavaRapidos.model.js
│       └── lavaRapidos.service.js
├── pages/
│   └── <nome-da-pagina>/
│       ├── <NomeDaPagina>.jsx   # componente de página, é o que a rota renderiza
│       ├── components/          # componentes usados só por essa página
│       └── service/
│           ├── <dominio>.routes.js   # paths/endpoints do domínio — só strings/funções de path
│           ├── <dominio>.model.js    # forma dos dados (JSDoc @typedef) + normalize<Entidade>(raw)
│           └── <dominio>.service.js  # funções que fazem fetch, usam routes.js + model.js
├── test/
│   ├── setup/                   # globalSetup do Vitest (sobe/derruba json-server de teste)
│   ├── fixtures/                # db.json isolados para teste (nunca reaproveitar o de dev)
│   └── <dominio>.service.test.js
├── App.jsx                      # <AppShell><Routes>...</Routes></AppShell>
└── main.jsx                     # bootstrap: ThemeProvider + CssBaseline + BrowserRouter
```

Regras derivadas dessa organização (aplicar em qualquer página nova):
1. **Uma página, uma pasta.** Tudo que só aquela página usa (componente principal, subcomponentes, service) mora dentro de `src/pages/<pagina>/`.
2. **`src/components/` é exceção, não regra.** Só criar/mover algo para lá quando um componente for genuinamente reaproveitado por 2 ou mais páginas. Não criar essa pasta "para o futuro" antecipadamente (YAGNI) — ela nasce quando o segundo uso aparece. `components/layout/` (seção 4.1) foi o primeiro caso real: o shell é usado por toda página, não por uma só.
3. **`service/` sempre com 3 arquivos separados** (`*.routes.js`, `*.model.js`, `*.service.js`), nunca um único arquivo monolítico. Motivo: quando o back-end real existir, a migração fica isolada em `*.routes.js` (e possivelmente `*.model.js`), sem tocar em quem consome o service.
4. **`*.service.js` nunca hardcoda paths** — todo path vem de `*.routes.js`. Nunca hardcoda a forma do dado retornado sem passar por `*.model.js` (normalização).
5. **Nenhum mock estático solto** (ex.: um array em `src/mocks/`). Dado de exemplo vive no `db.json` do `json-server` (dev) ou nas fixtures de teste — a página sempre busca dado através do `service`, nunca de um array hardcoded no componente.

### 4.1 Shell da aplicação (`AppShell`, `Sidebar`, `PageHeader`)

Toda página é renderizada dentro do shell definido em `src/App.jsx` (`<AppShell><Routes>...</Routes></AppShell>`) — nenhuma página deve montar seu próprio header ou navegação.

- **`AppShell.jsx`**: layout raiz — `Drawer` permanente (sidebar) à esquerda + área de conteúdo à direita. Fixo/desktop-first por decisão explícita (sem colapsar, sem adaptação mobile) — revisar esta seção se isso mudar.
- **`Sidebar.jsx`**: navegação lateral. Cada item é `{ label, path, icon }`; itens sem `path` (páginas ainda não implementadas) renderizam desabilitados com tooltip "Em breve", em vez de somem da lista — dá visibilidade do que vem a seguir. O item ativo é destacado via `NavLink`/`useLocation` do `react-router-dom`. Agrupamento hoje: um único grupo "Operação" (sem correspondência direta com nenhuma referência externa — ajustar se o domínio pedir seções específicas no futuro).
- **`PageHeader.jsx`**: cabeçalho padrão de página — `breadcrumbs` (array de strings) + `title` + slot opcional `action` (ex.: um botão no canto direito). Toda página nova deve abrir seu conteúdo com `<PageHeader title="..." breadcrumbs={[...]} />` em vez de um `Typography` solto.
- **Fidelidade visual**: o shell segue só a *estrutura* de uma referência externa (sidebar + breadcrumb + header, inspirado no painel do lojista do iFood) — cores, ícones e estilo continuam o tema padrão do MUI (ver seção 3), sem tentar copiar a identidade visual de outro produto.

### 4.2 Login e sessão (`src/login/`)

Desde a task `selecao-empresa-admin-front` (`docs/plan/selecao-empresa-admin-front/`), o admin-front pede login antes de mostrar qualquer página: `App.jsx` usa `useSessaoEmpresa()` e, sem empresa logada, renderiza só `<Login/>` (nada de `AppShell`/rotas por trás).

- **`sessao.storage.js`**: sessão local via `localStorage`, uma única chave (`washaway:empresaLogadaId`) guardando o `id` do `LavaRapido` logado — não guarda token nem senha. `getEmpresaLogadaId()` / `setEmpresaLogadaId(id)` / `limparSessao()`.
- **`service/lavaRapidos.*`**: mesma convenção `routes.js`/`model.js`/`service.js` das outras páginas (seção 4), mas `cadastrar()`/`entrar()` usam `fetch` cru em vez do `createHttpClient` compartilhado (`src/services/httpClient.js`) — esse helper só lança um erro genérico em qualquer status não-2xx, e login/cadastro precisam distinguir `401` (credencial inválida) de `409` (CNPJ duplicado) pra mostrar mensagens diferentes. Ambas aceitam um segundo parâmetro opcional `baseUrl` (default: o mesmo `BASE_URL` do módulo) só pra permitir apontar a um backend de teste isolado nos testes (seção 9) — não é usado em produção.
- **`useSessaoEmpresa.js`**: hook único que combina `sessao.storage.js` + `service/lavaRapidos.service.js` — expõe `{ empresaLogada, loading, entrar, cadastrar, sair }`. Ao montar, se já houver um `id` salvo, busca o `LavaRapido` no backend pra revalidar a sessão (limpa a sessão se o `GET` falhar, ex.: empresa apagada).
- **`Login.jsx`**: formulário único com toggle "Entrar"/"Cadastrar" (não são duas rotas/páginas separadas). "Entrar" pede CNPJ + senha; "Cadastrar" pede nome + CNPJ + endereço — **sem** campo de senha (o backend fixa a senha como `"admin"`, ver `backend.specs.md` seção 4; a tela só avisa isso em texto). Erros de `entrar`/`cadastrar` (401/409/rede) aparecem via `Snackbar`/`Alert` (`useToast()`).
- **Endereço via CEP** (`docs/plan/cep-cadastro-admin-front/`): o cadastro pede CEP + Número + Logradouro/Bairro/Cidade/Estado, em vez de um único campo livre. `service/cep.service.js` (`buscarCep(cep, baseUrl?)`) chama a **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`, pública, sem chave) assim que o campo CEP atinge 8 dígitos (`onChange`, não `onBlur` — ajustado depois do `/task-implement` a pedido do usuário) e autopreenche Logradouro/Bairro/Cidade/Estado — que continuam editáveis (cobre CEP não encontrado ou dado incompleto/errado). Número nunca vem da API (ViaCEP não retorna isso), é sempre digitado. No submit, os campos são concatenados numa única string (`"{logradouro}, {numero} - {bairro}, {cidade} - {estado}, CEP {cep}"`) e mandados como `address` pro backend — **sem mudança de contrato**, `LavaRapido.address` continua `String?` único (ver `backend.specs.md` seção 4), já que nada além da exibição consome as partes separadamente.
- **Company logada / sair**: `AppShell.jsx` recebe `empresaLogada`/`onSair` de `App.jsx` e mostra o nome da empresa no topo do Drawer; `Sidebar.jsx` recebe `onSair` e renderiza um item "Sair" fixo no rodapé da navegação (chama `sair()`, que só limpa a sessão local — não é uma chamada de rede).
- **Badge "Aberto"/"Fechado" + "Reabrir"** (`docs/plan/isopen-intercorrencia-backend/`): abaixo do nome da empresa no `AppShell.jsx`, um `Chip` mostra `empresaLogada.isOpen` (já vem calculado do backend, ver `backend.specs.md` seção 5 — considera intercorrência ativa agora, não só a coluna crua). Quando fechado por causa de uma intercorrência (`empresaLogada.intercorrenciaAtiva` presente), mostra o motivo e um botão "Reabrir" que chama `useSessaoEmpresa().reabrir()` — esse método manda `PATCH /intercorrencias/:id { reaberta: true }` (`src/login/service/intercorrencias.service.js`) e recarrega a empresa (`getLavaRapido`) pra refletir o novo estado. Não há "Reabrir" quando `isOpen: false` vem da própria coluna do banco (sem `intercorrenciaAtiva`) — isso não tem endpoint de toggle manual, fora de escopo.
- **Pedidos filtrados por empresa**: `pedidos.service.js` (`painel-pedidos`) lê `getEmpresaLogadaId()` direto (não recebe como parâmetro do chamador) e manda `?lavaRapidoId=` em `GET /pedidos` — ver `backend.specs.md` seção 5.

## 5. Back-end

O back-end real (`WashAway/backend/`, Express + Prisma + PostgreSQL — ver `WashAway/.specs/backend.specs.md`) cobre agora as 4 páginas: `pedidos`/`lava-rapidos` (escopo do `backend-mvp`) e, desde `migrar-servicos-disponibilidade-veiculos-backend`, também `servicos`/`disponibilidade`/`veiculos`.

- **Todas as 4 páginas apontam pro backend real por padrão**: cada `*.service.js` usa `BACKEND_API_BASE_URL` (`http://localhost:4000`, `src/config/api.js`) e manda `?lavaRapidoId=` (via `getEmpresaLogadaId()`, `src/login/sessao.storage.js`) nas chamadas de `GET`; `disponibilidade.service.js` injeta `lavaRapidoId` no body do `POST /intercorrencias` também via `getEmpresaLogadaId()` — nenhuma página (`.jsx`) passa isso explicitamente, o `service` busca sozinho na sessão (mesmo padrão de `pedidos.service.js`). Pra usar o `json-server` como fallback manual: `npm run mock-server` (porta 3001) + `VITE_API_BASE_URL=http://localhost:3001` — o `mock-server`/`db.json` continuam existindo, não foram removidos.
- **Em teste**: cada suíte de `service` (das 4 páginas) sobe seu próprio `json-server` de teste via `globalSetup` do Vitest — funciona como dublê do backend real (mesmas rotas/filtro por `lavaRapidoId`, já que `json-server` filtra por igualdade de campo nativamente), não bate no Postgres.
- **Nota sobre a versão do `json-server`**: a versão instalada (`^1.0.0-beta.15`) é a reescrita v1, com CLI diferente da v0 clássica — não tem flag `--watch` (recarrega sozinho) e normaliza `id` para string, além de injetar um campo `$schema` no `db.json` ao rodar. Isso é esperado, não é bug.

## 6. Domínio conhecido até aqui

### LavaRapido / empresa logada (`src/login/`)
```
LavaRapido {
  id: string
  name: string
  address: string | null
  isOpen: boolean
  intercorrenciaAtiva: { id, motivo, diaInteiro, horaInicio, horaFim } | null
}
```
Forma normalizada pelo admin-front (`src/login/service/lavaRapidos.model.js`) — o backend guarda mais campos (`cnpj`, `senha` hasheada, `rating`, etc., ver `backend.specs.md` seção 4), mas o admin-front só precisa de `id`/`name`/`address`/`isOpen`/`intercorrenciaAtiva` pra sessão e exibição (badge "Aberto"/"Fechado", seção 4.2); `normalizeLavaRapido` descarta o resto (inclusive `senha`, que a API já nem devolve).

### Pedido (página `painel-pedidos`)
```
Pedido {
  id: string
  veiculo: { modelo: string, placa: string }
  servico: string
  horario: string (ISO datetime)
  status: 'pendente' | 'em_andamento' | 'concluido'
  fotos: string[] (URLs)
}
```
Fonte de verdade da forma desse dado: `src/pages/painel-pedidos/service/pedidos.model.js`.

### Serviço (página `servicos`)
```
Servico {
  id: string
  nome: string
  categoria: string
  preco: number
  ativo: boolean
}
```
**Importante**: o catálogo de serviços (criar/editar/definir preço) não é gerido pelo admin-front — é assumido como já existente via um "onboarding do dono" que ainda não existe (ver `docs/plan/telas-servicos-disponibilidade-veiculos`). O admin-front é um **"PDV"** (operação do dia a dia), não um **"ERP"** (cadastro/config do negócio) — a página `servicos` só lista e alterna `ativo`/`inativo`, nunca cria/edita/exclui.

### Intercorrência (página `disponibilidade`)
```
Intercorrencia {
  id: string
  data: string (YYYY-MM-DD)
  motivo: string
  diaInteiro: boolean
  horaInicio?: string (HH:mm, só quando diaInteiro é false)
  horaFim?: string (HH:mm, só quando diaInteiro é false)
}
```
Representa uma exceção pontual à agenda regular (ex.: feriado, falta de energia) — **não** é o cadastro da agenda semanal regular em si (isso também seria papel do onboarding do dono, que não existe ainda).

### Veículo (página `veiculos`)
```
Veiculo {
  id: string
  modelo: string
  placa: string
}
```
Mesma forma já usada em `Pedido.veiculo`. A página `veiculos` só exibe (read-only) — o cadastro é feito pelo consumidor (ainda não implementado em nenhum front). Sem conceito de funcionário responsável nem categorização por tipo de veículo (ex.: "utilitário") — fora de escopo.

## 7. Feature flags

Convenção: `src/config/featureFlags.js` exporta um objeto `FEATURE_FLAGS` com uma chave por flag, valor booleano. É uma constante no código — para alternar, edita o arquivo e roda de novo (sem env var, sem toggle em runtime pela UI, decisão explícita registrada no Log de decisões).

Flags ativas:
| Flag | Padrão | O que controla |
|---|---|---|
| `fotosPedido` | `false` | Seção de fotos do veículo no detalhe do pedido (`PedidoDetalhe.jsx`). Desligada porque o fluxo de fotos (upload real, storage) ainda não foi implementado ponta a ponta — a UI já existe e funciona contra o mock, só fica invisível até a flag ligar. |

Regra para novas flags: mesma convenção (chave em `FEATURE_FLAGS`, consumida via `if (FEATURE_FLAGS.minhaFlag)` no componente), a menos que uma task futura decida por outro mecanismo (nesse caso, atualizar esta seção).

## 8. Páginas — status

| Página | Rota | Pasta | Status |
|---|---|---|---|
| Painel de pedidos | `/` | `src/pages/painel-pedidos/` | Implementada (task `painel-de-pedidos`, plano em `docs/plan/painel-de-pedidos/painel-de-pedidos-v2.md`); backend real desde `backend-mvp` |
| Serviços | `/servicos` | `src/pages/servicos/` | Implementada (task `telas-servicos-disponibilidade-veiculos`) — só listar + ativar/desativar, sem criar/editar/excluir (ver seção 6); backend real desde `migrar-servicos-disponibilidade-veiculos-backend` |
| Disponibilidade | `/disponibilidade` | `src/pages/disponibilidade/` | Implementada (task `telas-servicos-disponibilidade-veiculos`) — calendário de intercorrências pontuais, não a agenda regular; backend real desde `migrar-servicos-disponibilidade-veiculos-backend` |
| Veículos | `/veiculos` | `src/pages/veiculos/` | Implementada (task `telas-servicos-disponibilidade-veiculos`) — listagem read-only; backend real (derivado de `Pedido`, sem tabela própria) desde `migrar-servicos-disponibilidade-veiculos-backend` |

## 9. Testes

- Runner: Vitest (`npm run test`, `--passWithNoTests` enquanto nem toda página tem teste ainda).
- Cobertura mínima esperada por `service`: pelo menos um teste que exercite `get*`/`update*` contra um `json-server` de teste real (não `fetch` mockado) — ver seção 5.
- `src/test/setup/globalSetup.js` é compartilhado; cada domínio usa sua própria fixture em `src/test/fixtures/` e sua própria porta, para não conflitar entre suítes.
- `src/test/setup/localStorageShim.js` (`setupFiles` do Vitest) — Node não tem `localStorage` global por padrão; esse shim (um `Map` em memória) existe só pra `sessao.storage.js` (e qualquer coisa que dependa dele, ex. `pedidos.service.js` filtrando por `lavaRapidoId`) funcionar nos testes sem precisar de `jsdom`.
- **`lavaRapidos.service.test.js`** foge do padrão "sempre contra o `json-server` de teste" (seção 5): `entrar`/`cadastrar` fazem validação de credencial/duplicidade (401/409) que o `json-server` genérico não simula (não tem bcrypt nem checagem de unicidade). Em vez disso, o teste sobe um servidor HTTP mínimo (`node:http`, sem dependência nova) só pra devolver os status codes esperados — cobre a lógica que o admin-front realmente possui (mapear status → erro amigável, nunca expor `senha`), não a lógica de auth em si (essa é coberta nos testes do backend).
- Testes de componente/UI ainda não fazem parte da convenção (nenhuma task pediu isso até aqui) — se/quando entrar, atualizar esta seção.

## 10. Convenções gerais de código

- JSX puro, sem TypeScript.
- Nomes de arquivo de componente em `PascalCase.jsx`; service/routes/model em `camelCase` com sufixo do tipo (`pedidos.service.js`, `pedidos.routes.js`, `pedidos.model.js`).
- Nomes de pasta de página em `kebab-case` (`painel-pedidos`), o componente dentro dela em `PascalCase` (`PainelPedidos.jsx`).
- Preferir componentes MUI prontos a HTML/CSS customizado.
- Sem gerenciamento de estado global (Redux/Zustand/Context de app) até que uma necessidade real apareça — hoje cada página gerencia seu próprio estado com `useState`/`useEffect`.

## 11. Log de decisões

Decisões arquiteturais tomadas ao longo das tasks, na ordem em que foram confirmadas. Servem de justificativa para as convenções acima — antes de propor uma mudança que contradiga uma linha aqui, ler o porquê.

1. **JSX + Vite + Material UI** (`docs/plan/setup-projeto-admin-front`) — stack definida explicitamente pelo usuário para destravar o trabalho de UI.
2. **Organização por página, não por camada técnica** (`docs/plan/servicos-e-mock-backend`) — cada página é dona do seu `service/` e `components/`; `src/components/` global só quando houver reaproveitamento real entre páginas.
3. **`service/` sempre com `routes.js` + `model.js` + `service.js` separados** (`docs/plan/servicos-e-mock-backend`) — minimiza o retrabalho de migração quando o back-end real existir: só `routes.js`/`model.js` mudam.
4. **`json-server` como back-end simulado**, tanto em dev (`npm run mock-server`) quanto em teste (`globalSetup` do Vitest) — permite desenvolver e testar contra HTTP real antes do back-end existir.
5. **Sem mock estático solto** (`docs/plan/painel-de-pedidos/painel-de-pedidos-v2.md`) — decisão de fundir o plano de UI do painel de pedidos com o de service/json-server, eliminando o array mockado local que o plano original do painel previa.
6. **Feature flag como constante no código, padrão desligado, sem env var** (`docs/plan/painel-de-pedidos`, confirmado com o usuário) — simplicidade sobre flexibilidade, enquanto só há uma flag e um ambiente relevante (dev).
7. **Ações de mudança de estado permitidas na UI de leitura** (`docs/plan/painel-de-pedidos`, confirmado com o usuário) — o painel de pedidos não é só leitura: o dono do lava-rápido pode alterar o status do pedido por ali.
8. **Contrato de API provisório = rotas padrão do `json-server`** (`docs/plan/painel-de-pedidos`, confirmado com o usuário) — não vale a pena modelar um contrato específico do back-end real antes dele existir.
9. **Shell com sidebar fixa + `PageHeader`, só na estrutura** (`docs/plan/shell-sidebar-navegacao`, confirmado com o usuário) — inspirado numa referência externa (painel do lojista do iFood), mas copiando só o padrão estrutural (navegação lateral + breadcrumb/título), não cores/estilo. Mantém o tema MUI padrão; sem colapso/responsividade da sidebar por ora. Primeiro uso real de `src/components/` global.
10. **admin-front é "PDV", não "ERP"** (`docs/plan/telas-servicos-disponibilidade-veiculos`, confirmado com o usuário) — cadastro/configuração do negócio (catálogo de serviços, agenda regular, tipos de veículo) fica pra um onboarding do dono que ainda não existe; o admin-front só opera o dia a dia em cima disso (ativar/desativar serviço, registrar intercorrência pontual, ver veículos). Essa distinção guia o recorte de qualquer página nova que pareça "cadastro".
11. **Login real por CNPJ + senha fixa, não "lembrar localmente"** (`docs/plan/selecao-empresa-admin-front`, confirmado com o usuário após 3 rodadas de correção) — a primeira ideia (dispositivo "lembra" qual empresa foi cadastrada nele, sem senha) foi descartada porque não permite login de outro aparelho; a segunda ideia (selecionar entre todas as empresas cadastradas, sem cadastro próprio) também foi descartada por confundir "selecionar empresa existente" com "onboarding/cadastro da própria empresa" (analogia usada: iFood dono da loja vs. iFood consumidor). Decisão final: cadastro (nome + endereço + CNPJ, sem pedir senha) com senha sempre fixada como `"admin"` no backend, e login de verdade (CNPJ + senha) contra o backend — funciona de qualquer aparelho, sem exigir um modelo de auth completo (JWT etc., fora de escopo).
12. **`Veiculo` sem tabela própria no backend** (`docs/plan/migrar-servicos-disponibilidade-veiculos-backend`) — um veículo já existe embutido em `Pedido.veiculo`; a página `veiculos` só precisa listar, então `GET /veiculos` deriva a lista (dedup por `placa`) em vez de normalizar uma entidade nova sem caso de uso que dependa disso (YAGNI).
13. **Services continuam buscando `lavaRapidoId` sozinhos, nunca recebendo por prop** (`docs/plan/migrar-servicos-disponibilidade-veiculos-backend`) — mesmo padrão que `pedidos.service.js` já usava (`getEmpresaLogadaId()` importado direto no `service.js`); nenhuma das páginas (`Servicos.jsx`/`Disponibilidade.jsx`/`Veiculos.jsx`) precisou mudar.
14. **Badge "Aberto"/"Fechado" + "Reabrir" no `AppShell.jsx`** (`docs/plan/isopen-intercorrencia-backend/`) — achado ao validar a task `servicos-disponibilidade-app-mobile`: `LavaRapido.isOpen` nunca refletia intercorrências cadastradas. Resolvido calculando `isOpen` no backend (ver `backend.specs.md` seção 5); o admin-front só exibe o que já vem calculado e oferece "Reabrir" (`PATCH /intercorrencias/:id { reaberta: true }`) pra reverter um fechamento automático manualmente.

## 12. Riscos/decisões ainda em aberto

- `docs/plan/painel-de-pedidos/painel-de-pedidos-v2.md` — script único para subir `mock-server` + dev server juntos, porta fixa do `json-server`, se os dois `db.json` (dev/teste) deveriam ser um só, fonte específica das fotos placeholder.
- `docs/plan/shell-sidebar-navegacao/shell-sidebar-navegacao.md` — nomes/agrupamento dos itens de menu da sidebar (hoje assumido um único grupo "Operação", sem indicação do usuário).
- `docs/plan/telas-servicos-disponibilidade-veiculos/telas-servicos-disponibilidade-veiculos.md` — depende de um "onboarding do dono do lava-rápido" (cadastro do catálogo de serviços, tipos de veículo, agenda regular) que ainda não existe em nenhum front; as 3 páginas novas (`servicos`/`disponibilidade`/`veiculos`) já usam o backend real (seed com dados por lava-rápido, ver `backend.specs.md` seção 3), mas continuam sem UI de cadastro/edição do catálogo em si — isso simula o onboarding já ter acontecido.

## Referências
- `CLAUDE.md` (raiz do repo) — status geral do projeto, atualizado a cada task.
- `WashAway/README.md` — anotações originais de escopo/personas do produto WashAway como um todo (não só admin-front).
- `docs/plan/` — planos de cada task, com o "Como" e "Por quê" detalhados.
- `docs/logs/` — o que foi de fato implementado em cada task (pode divergir do plano — checar "Desvios em relação ao plano" em cada log).
