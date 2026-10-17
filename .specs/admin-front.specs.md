# admin-front — Spec

> Documento de referência técnica do `admin-front`, no padrão spec-driven development: descreve o que o projeto é, como ele é organizado e quais convenções valem para qualquer trabalho novo nele. Antes de implementar uma feature nova neste projeto, ler este documento primeiro. Ele é atualizado conforme decisões arquiteturais são tomadas (ver "Log de decisões" no final); PRs/tasks que mudam convenção devem atualizar este arquivo.

## 1. Visão geral

`admin-front` é a interface administrativa web do lava-rápido (persona "Dono do lava-rápido" — ver `WashAway/README.md`). O consumidor final usa um app mobile (fora deste repositório/escopo); este projeto atende só quem opera o lava-rápido.

- **Por quê existe**: a persona "Dono do lava-rápido" tem "equipe pequena, muitos contatos dispersos e pouco confiáveis" e "necessita de um bom intermediário" — o admin-front centraliza a operação (pedidos, serviços, disponibilidade, veículos) num único lugar.
- **Quem usa**: o dono/operador do lava-rápido. Não é usado pelo consumidor final.
- **Como se relaciona com o resto do sistema**: consome o back-end HTTP real (`WashAway/backend/`, ver seção 5 e `backend.specs.md`), a mesma API usada pelo app mobile do consumidor.

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
- Refresh de sessão e troca voluntária de senha pela interface — o login (CNPJ + senha própria) devolve um token de lava-rápido desde o I17 (seção 4.2); a troca obrigatória (senha temporária) e o "esqueci minha senha" existem desde o `i17-senha-gerada` (seção 4.2); a troca voluntária só pela API (`POST /auth/lava-rapido/trocar-senha` com `senhaAtual`).
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
4. Abrir `http://localhost:5173` no navegador. Sem o passo 2 (algum back-end no ar em `BASE_URL`), nem o login carrega (erro de rede). A tela inicial agora é sempre o login (seção 4.2) — sem uma empresa cadastrada no backend, use a aba "Cadastrar" (nome, CEP + número — endereço autopreenchido pela ViaCEP, ver seção 4.2 — + CNPJ, 14 dígitos, e-mail e senha própria com no mínimo 8 caracteres). Empresas de demo criadas pelo `prisma:demo` depois do I17 entram com a senha `demo1234`; as que já existiam no banco de dev saem do `admin` pelo script de troca em massa do `i17-senha-gerada` (`npm run senhas:troca-em-massa` no backend; a senha temporária chega por e-mail e o painel pede a senha nova — só desenvolvimento, ver `backend.specs.md` seção 5.5).

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
│   ├── EsqueciSenha.jsx          # i17-senha-gerada: modo "Esqueci minha senha" dentro do card do Login
│   ├── DefinirNovaSenha.jsx      # i17-senha-gerada: troca obrigatória depois de entrar com a senha temporária
│   ├── validarNovaSenha.js       # regra de senha (mín. 8 + confirmação), usada no cadastro e na troca
│   ├── sessao.storage.js
│   ├── useSessaoEmpresa.js
│   └── service/
│       ├── lavaRapidos.routes.js
│       ├── lavaRapidos.model.js
│       ├── lavaRapidos.service.js
│       └── senhas.{routes,service}.js   # i17-senha-gerada: esqueci-senha / trocar-senha
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

- **`sessao.storage.js`**: sessão local via `localStorage`: `washaway:empresaLogadaId` (id do `LavaRapido` logado) e, desde o I17, `washaway:token` (token de lava-rápido) — nunca guarda senha. `getEmpresaLogadaId()` / `setEmpresaLogadaId(id)` / `getToken()` / `setToken(token)` / `limparSessao()` (apaga os dois).
- **Token nas chamadas (I17, `docs/plan/i17-acesso-seguro-painel/`)**: `src/services/httpClient.js` (`createHttpClient` e `fetchComToken`) anexa `Authorization: Bearer <token>` sempre que há token na sessão; um `401` chama o callback registrado com `definirAoExpirarSessao(fn)` — `useSessaoEmpresa` limpa a sessão e volta ao Login com o aviso "Sua sessão expirou. Entre de novo." (`avisoSessao`, mostrado num `Alert` no topo do Login). A empresa das rotas de gestão **vem do token**: os services não mandam mais `?lavaRapidoId=` em `GET /pedidos`/`GET /veiculos` nem `lavaRapidoId` no body de `POST /servicos`/`POST /intercorrencias`. As **leituras públicas** `GET /servicos?lavaRapidoId=` e `GET /intercorrencias?lavaRapidoId=` (as mesmas do app do cliente) continuam filtrando pela empresa da sessão. "Reabrir" (`login/service/intercorrencias.service.js`) usa `fetchComToken`.
- **`service/lavaRapidos.*`**: mesma convenção `routes.js`/`model.js`/`service.js` das outras páginas (seção 4), mas `entrar()` usa `fetch` cru (rota pública, sem token) em vez do `createHttpClient` — esse helper só lança um erro genérico em qualquer status não-2xx, e o login precisa distinguir `401` (credencial inválida) de `429` (limite de tentativas — mostra a mensagem do backend). `entrar()` devolve a sessão `{ token, empresa }` (`normalizeSessao` em `lavaRapidos.model.js`: o backend responde `{ token, expiraEm, lavaRapido }` e a empresa passa pelo mesmo `normalizeLavaRapido`, com `horarios`/`foraDoHorario`). Aceita um segundo parâmetro opcional `baseUrl` só pra apontar a um backend de teste isolado (seção 9). O antigo `cadastrar()` (`POST /lavaRapidos`) foi removido junto com a rota (I17).
- **`useSessaoEmpresa.js`**: hook único que combina `sessao.storage.js` + `service/lavaRapidos.service.js` — expõe `{ empresaLogada, solicitacaoPendente, loading, avisoSessao, entrar, cadastrar, aceitarContrato, cancelarOnboarding, sair, reabrir }`. Login e aceite do contrato gravam token + id. Ao montar, se houver `id` **e** token salvos, busca o `LavaRapido` no backend pra revalidar (limpa a sessão se falhar); sessão antiga só com `id` (de antes do I17) é descartada — precisa entrar de novo.
- **Onboarding com contrato** (`docs/plan/onboarding-contrato-empresa/`): "Cadastrar" **não cria mais a empresa direto** — `useSessaoEmpresa().cadastrar` chama `service/onboarding.service.js#solicitar` (`POST /onboarding/solicitacoes`), guarda o id em `localStorage` (`washaway:solicitacaoOnboardingId`, via `sessao.storage.js`) e expõe `solicitacaoPendente`. Com solicitação pendente e sem empresa logada, `App.jsx` renderiza **`OnboardingContrato.jsx`**: status ("Aprovada — aguardando contrato"), nome/CNPJ, contrato vigente (título, versão, texto rolável) e um campo onde o dono digita `eu aceito` (botão "Assinar contrato" só habilita com o texto certo). Assinar chama `aceitarContrato` (`POST .../aceite`), que devolve a sessão `{ token, lavaRapido }` (I17) — a sessão vira "empresa logada" direto. "Voltar" (`cancelarOnboarding`) só limpa a solicitação local. No boot, sem empresa logada mas com solicitação salva, ela é recarregada (se ainda `aguardando_contrato`) para retomar a tela do contrato. `solicitar` envia também `email` e `senha` (I17); `409` vira "Já existe uma empresa cadastrada com esse CNPJ." ou "... com esse e-mail.", conforme o backend — ou a própria mensagem do backend quando já há **solicitação em andamento** para o CNPJ com outro e-mail/senha (retomar exige o mesmo e-mail e a mesma senha).
- **`Login.jsx`**: formulário único com toggle "Entrar"/"Cadastrar" (não são duas rotas/páginas separadas). "Entrar" pede CNPJ + senha; "Cadastrar" pede nome + CNPJ + endereço + **E-mail + Senha + Confirmar senha** (I17: mínimo 8 caracteres e confirmação igual, validados antes de enviar; fim da senha fixa `"admin"`) e o botão é "Solicitar cadastro" (abre a solicitação de onboarding, item acima). Erros de `entrar`/`cadastrar` (401/409/429/rede) aparecem via `Snackbar`/`Alert` (`useToast()`); o aviso de sessão expirada aparece num `Alert` fixo no topo.
- **Senha temporária e troca obrigatória** (`docs/plan/i17-senha-gerada/`): se o login devolve `trocaDeSenhaObrigatoria: true` (entrou com a senha temporária do e-mail), `useSessaoEmpresa` guarda `{ token, empresa }` **só em memória** (o token de escopo `trocar-senha` não vai para o `localStorage`; recarregar volta ao Login) e expõe `trocaDeSenhaObrigatoria`; o `App.jsx` mostra apenas **`DefinirNovaSenha.jsx`** (nova senha + confirmação, mín. 8) — nada do painel abre antes. Salvar chama `definirNovaSenha` → `service/senhas.service.js#trocarSenha` (`POST /auth/lava-rapido/trocar-senha` com o token de troca, sem o `httpClient`), que devolve a sessão normal e abre o painel. Token de troca expirado/usado (`401`) volta ao Login com aviso; "Voltar ao login" descarta a troca.
- **"Esqueci minha senha"**: link no modo "Entrar" do `Login.jsx`, que troca o conteúdo do card por **`EsqueciSenha.jsx`** (campo de e-mail) → `senhas.service.js#esqueciSenha` (`POST /auth/lava-rapido/esqueci-senha`) e mostra a mensagem genérica do backend ("Se o e-mail estiver cadastrado, enviaremos uma senha temporária") — nunca diz se o e-mail existe. `400`/`429` mostram a mensagem do backend.
- **Endereço via CEP** (`docs/plan/cep-cadastro-admin-front/`): o cadastro pede CEP + Número + Logradouro/Bairro/Cidade/Estado, em vez de um único campo livre — **todos obrigatórios** (`required`), não só Número/Nome/CNPJ como na primeira versão. `service/cep.service.js` (`buscarCep(cep, baseUrl?)`) chama a **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`, pública, sem chave) só quando o usuário clica no botão **"Buscar"** ao lado do campo CEP (não mais automático ao digitar/sair do campo — trocado por um botão explícito a pedido do usuário, considerado "mais seguro": evita disparar a busca em digitação parcial/acidental) e autopreenche Logradouro/Bairro/Cidade/Estado — que continuam editáveis (cobre CEP não encontrado ou dado incompleto/errado, e falha de rede — `buscarCep` nunca lança, sempre retorna `null` nesses casos). Número nunca vem da API (ViaCEP não retorna isso), é sempre digitado. No submit, os campos são concatenados numa única string (`"{logradouro}, {numero} - {bairro}, {cidade} - {estado}, CEP {cep}"`) e mandados como `address` pro backend — **sem mudança de contrato**, `LavaRapido.address` continua `String?` único (ver `backend.specs.md` seção 4), já que nada além da exibição consome as partes separadamente.
- **Company logada / sair**: `AppShell.jsx` recebe `empresaLogada`/`onSair` de `App.jsx` e mostra o nome da empresa no topo do Drawer; `Sidebar.jsx` recebe `onSair` e renderiza um item "Sair" fixo no rodapé da navegação (chama `sair()`, que só limpa a sessão local — não é uma chamada de rede).
- **Badge "Aberto"/"Fechado" + "Reabrir"** (`docs/plan/isopen-intercorrencia-backend/`): abaixo do nome da empresa no `AppShell.jsx`, um `Chip` mostra `empresaLogada.isOpen` (já vem calculado do backend, ver `backend.specs.md` seção 5 — considera intercorrência ativa agora, não só a coluna crua). Quando fechado por causa de uma intercorrência (`empresaLogada.intercorrenciaAtiva` presente), mostra o motivo e um botão "Reabrir" que chama `useSessaoEmpresa().reabrir()` — esse método manda `PATCH /intercorrencias/:id { reaberta: true }` (`src/login/service/intercorrencias.service.js`) e recarrega a empresa (`getLavaRapido`) pra refletir o novo estado. Não há "Reabrir" quando `isOpen: false` vem da própria coluna do banco (sem `intercorrenciaAtiva`) — isso não tem endpoint de toggle manual, fora de escopo.
- **Pedidos filtrados por empresa**: desde o I17 `GET /pedidos` vai só com o token — o backend filtra pela empresa do token (ver `backend.specs.md` seção 5.2).

## 5. Back-end

O back-end real (`WashAway/backend/`, Express + Prisma + PostgreSQL — ver `WashAway/.specs/backend.specs.md`) cobre agora as 4 páginas: `pedidos`/`lava-rapidos` (escopo do `backend-mvp`) e, desde `migrar-servicos-disponibilidade-veiculos-backend`, também `servicos`/`disponibilidade`/`veiculos`.

- **Todas as 4 páginas apontam pro backend real por padrão**: cada `*.service.js` usa `BACKEND_API_BASE_URL` (`http://localhost:4000`, `src/config/api.js`) e o token da sessão (via `createHttpClient`, I17). Só as leituras públicas (`GET /servicos`, `GET /intercorrencias`) mandam `?lavaRapidoId=` (via `getEmpresaLogadaId()`); pedidos, veículos e as escritas usam a empresa do token — nenhuma página (`.jsx`) passa isso explicitamente. Pra usar o `json-server` como fallback manual: `npm run mock-server` (porta 3001) + `VITE_API_BASE_URL=http://localhost:3001` — o `mock-server`/`db.json` continuam existindo, não foram removidos.
- **Em teste**: cada suíte de `service` (das 4 páginas) sobe seu próprio `json-server` de teste via `globalSetup` do Vitest — funciona como dublê do backend real (mesmas rotas, não bate no Postgres). O `json-server` não valida token: os testes conferem só o que o admin-front manda (sem `?lavaRapidoId=`/`lavaRapidoId` onde a empresa vem do token); o envio do header e o tratamento do `401` são cobertos por `src/test/httpClient.test.js` (servidor HTTP mínimo).
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
  cliente: { nome: string } | null          # null só em pedido no formato antigo
  veiculo: { marca: string | null, modelo: string, cor: string, placa: string }
  servicos: { nome: string, preco: number | null }[]   # nome/preço da compra (I13)
  precoTotal: number | null                 # calculado no backend
  duracaoMinutos: number | null
  horario: string (ISO datetime)
  status: 'pendente' | 'aceito' | 'recusado' | 'em_andamento' | 'concluido'
  statusAlteradoEm: string (ISO) | null     # I15: última mudança de status
  motivoRecusa: string | null               # I15: só em recusado
  fotos: string[] (URLs)
}
```
Fonte de verdade da forma desse dado: `src/pages/painel-pedidos/service/pedidos.model.js`. Desde o I13 (`docs/plan/i13-confirmacao-agendamento/`) o pedido vem do app do cliente (`POST /pedidos`) com cliente, veículo, vários serviços e total; a lista mostra **nome do cliente, total, veículo, serviços e horário**, e o detalhe (`PedidoDetalhe.jsx`) mostra veículo com cor, horário + duração estimada, um serviço por linha com preço e o total. `normalizePedido` também aceita o formato antigo (`veiculo` só com modelo/placa e `servico` em texto → um serviço sem preço, cliente "—"), usado no fixture/mock para garantir que nada quebra; o backend já migrou todos os pedidos para o formato novo. Helpers `formatarPreco` (`null` → "—") e `descreverVeiculo`.

**Aceite/recusa (I15, `docs/plan/i15-aceite-recusa-pedido/`).** O `Select` livre de status saiu. A lista separa os pendentes (`separarPendentes`, do horário mais próximo ao mais distante) numa seção **"Aguardando sua resposta"** com contador e borda de alerta, com os botões **Aceitar**/**Recusar** direto no card; os demais pedidos vêm abaixo ("Demais pedidos"). O detalhe mostra o status (chip), **"Alterado em"** (`statusAlteradoEm`, "—" se nunca mudou), o motivo em recusado e só os botões das ações permitidas (`components/AcoesPedido.jsx`, a partir de `PROXIMOS_STATUS` do model — mesmo fluxo do backend, que continua sendo quem valida): pendente → Aceitar/Recusar, aceito → Iniciar atendimento, em andamento → Concluir, nenhum em recusado/concluído. Recusar abre `components/RecusarPedidoDialog.jsx` (motivo opcional, contador até 200, "Confirmar recusa"; fecha só no sucesso). `updatePedidoStatus(id, status, motivo?)` manda `motivo` só ao recusar e se preenchido. Erro do backend (ex.: `409` de transição inválida) aparece no toast com a mensagem dele: `httpClient.request` passou a anexar `status` e `mensagemBackend` (o `error` do corpo) ao erro lançado, sem mudar a `message`.

### Serviço (página `servicos`)
```
Servico {                     // serviço da loja = combo de itens do catálogo
  id: string
  nome: string                // nome comercial livre
  preco: number               // preço total do combo
  ativo: boolean
  itens: { id, nome, categoria }[]
  categorias: string[]        // derivadas dos itens
}

ItemServico {                 // catálogo global (GET /itensServico), só leitura
  id: string
  nome: string
  descricao: string
  categoria: string
}
```
**Catálogo × combo** (`docs/plan/servicos-combos-catalogo/`, substitui a restrição "só ativar/desativar" de `telas-servicos-disponibilidade-veiculos`): a loja não digita o que faz. Ela **cria** e **edita** seus serviços (`ServicoFormDialog.jsx`: nome, preço e itens marcados em checkboxes agrupados por categoria, com ≥ 1 item) a partir do catálogo global de itens, que o admin-front só lê. Ativar/desativar continua no card; **não há exclusão** (desativa em vez de apagar). Cada card mostra os itens incluídos como chips e a duração estimada do combo (soma dos itens, `somarDuracao` em `servicos.model.js`); o diálogo mostra a duração de cada item e a do combo em tempo real conforme os itens são marcados (`tempo-estimado-preco-servicos`).

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
  marca: string | null
  modelo: string
  cor: string
  placa: string
}
```
Desde o I13, é o veículo cadastrado pelo cliente no app (I3) que aparece em algum pedido da empresa (relação `Pedido → Veiculo` no backend); a página mostra marca + modelo e cor · placa. A página `veiculos` só exibe (read-only) — o cadastro é feito pelo consumidor (ainda não implementado em nenhum front). Sem conceito de funcionário responsável nem categorização por tipo de veículo (ex.: "utilitário") — fora de escopo.

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
| Serviços | `/servicos` | `src/pages/servicos/` | Implementada (task `telas-servicos-disponibilidade-veiculos`); backend real desde `migrar-servicos-disponibilidade-veiculos-backend`; desde `servicos-combos-catalogo` cria/edita combos de itens do catálogo + ativa/desativa, sem excluir (ver seção 6) |
| Disponibilidade | `/disponibilidade` | `src/pages/disponibilidade/` | Implementada (task `telas-servicos-disponibilidade-veiculos`) — calendário de intercorrências pontuais; backend real desde `migrar-servicos-disponibilidade-veiculos-backend`. Desde o I19 mostra também o **horário de funcionamento semanal** (`components/HorarioFuncionamento.jsx`, dados iniciais de `empresaLogada.horarios`, "hoje" no fuso America/Sao_Paulo). Desde o I19 parte 2 é **editável**: por dia, `Switch` "Fechado" ou abertura/fechamento (`TextField type="time"`), botão "Salvar horário" → `salvarHorarios(dias)` (`PUT /lavaRapidos/:id/horarios`, com token, id da sessão; usa `fetchComToken` para mostrar no toast a mensagem de validação do backend). A validação fica no backend; os helpers puros `horariosParaEdicao`/`edicaoParaDias` (`horarioFuncionamento.js`) montam o formulário e o body. Depois de salvar, `recarregarEmpresa()` (`useSessaoEmpresa`, passado pelo `App.jsx` como `onHorarioSalvo`) busca a empresa de novo para o status do topo (Aberto/Fechado/Fora do horário) refletir o novo horário |
| Veículos | `/veiculos` | `src/pages/veiculos/` | Implementada (task `telas-servicos-disponibilidade-veiculos`) — listagem read-only; backend real desde `migrar-servicos-disponibilidade-veiculos-backend`; desde o I13 lista os veículos (do cadastro do cliente) dos pedidos da empresa |
| Minha empresa | `/minha-empresa` | `src/pages/minha-empresa/` | Implementada (`i17-interno-exclusao`) — dados da empresa logada (nome, endereço) e **exclusão por solicitação**: botão "Solicitar exclusão da empresa" abre `components/SolicitarExclusaoDialog.jsx` (confirmação + motivo opcional, até 500); com a solicitação pendente mostra a data/motivo e "Cancelar solicitação"; recusada/cancelada mostra um aviso (com a observação da equipe) e permite solicitar de novo. `service/minhaEmpresa.service.js` (`getSolicitacaoExclusao` → `null` no `404`, `solicitarExclusao(motivo)`, `cancelarSolicitacaoExclusao`) usa `fetchComToken` em `/lavaRapidos/me/solicitacao-exclusao`. A aprovação é da equipe WashAway (sem tela; ver `backend.specs.md` seção 5.4) — depois de aprovada a empresa não existe mais e o próximo request dá `401`, que volta ao Login. Item "Minha empresa" na `Sidebar` |

## 9. Testes

- Runner: Vitest (`npm run test`, `--passWithNoTests` enquanto nem toda página tem teste ainda).
- Cobertura mínima esperada por `service`: pelo menos um teste que exercite `get*`/`update*` contra um `json-server` de teste real (não `fetch` mockado) — ver seção 5.
- `src/test/setup/globalSetup.js` é compartilhado; cada domínio usa sua própria fixture em `src/test/fixtures/` e sua própria porta, para não conflitar entre suítes.
- `src/test/setup/localStorageShim.js` (`setupFiles` do Vitest) — Node não tem `localStorage` global por padrão; esse shim (um `Map` em memória) existe só pra `sessao.storage.js` (e qualquer coisa que dependa dele, ex. `pedidos.service.js` filtrando por `lavaRapidoId`) funcionar nos testes sem precisar de `jsdom`.
- **`lavaRapidos.service.test.js`** foge do padrão "sempre contra o `json-server` de teste" (seção 5): `entrar` faz validação de credencial (401) e limite de tentativas (429), e devolve `{ token, lavaRapido }` (I17) — coisas que o `json-server` genérico não simula (não tem bcrypt nem checagem de unicidade). Em vez disso, o teste sobe um servidor HTTP mínimo (`node:http`, sem dependência nova) só pra devolver os status codes esperados — cobre a lógica que o admin-front realmente possui (mapear status → erro amigável, nunca expor `senha`), não a lógica de auth em si (essa é coberta nos testes do backend).
- **`onboarding.service.test.js`** segue o mesmo padrão de servidor HTTP mínimo de `lavaRapidos.service.test.js` (o fluxo solicitação → aceite → login tem regra de estado que o `json-server` não simula).
- **`senhas.service.test.js`** (i17-senha-gerada) idem: stub HTTP de `/auth/lava-rapido/{esqueci-senha,trocar-senha}` (mensagem genérica, 400/429, token de troca no header, 401 → `TrocaDeSenhaExpiradaError`).
- **`minhaEmpresa.service.test.js`** (i17-interno-exclusao) idem: stub HTTP de `/lavaRapidos/me/solicitacao-exclusao` (404 sem solicitação, uma pendente só, cancelar) — o service recebe `baseUrl` opcional para apontar ao stub.
- Testes de componente/UI ainda não fazem parte da convenção (decisão do plano `testes-automatizados`: nenhum nesta sprint) — se/quando entrar, atualizar esta seção.
- **Lugar na pirâmide do projeto** (estratégia completa em `backend.specs.md`, seção 6.1): o admin-front testa a camada `service` e funções puras; as regras de negócio e os status HTTP são testados no backend (integração de API).
- **Cobertura:** `npm run test:coverage` gera relatório em `coverage/` (v8, só relatório, não bloqueia PR).
- **Convenção para as histórias:** cada critério "Testes automatizados: A, B, C" vira um `describe` com um `it` por caso citado, com o mesmo texto.
- **CI:** `.github/workflows/testes.yml` roda `npm run lint`, `npm run test:coverage` e `npm run build` em todo PR e push na `main`. Pela raiz, `python3 scripts/test.py --project all` roda os três projetos.

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
10. **admin-front é "PDV", não "ERP"** (`docs/plan/telas-servicos-disponibilidade-veiculos`, confirmado com o usuário) — cadastro/configuração do negócio (catálogo de serviços, agenda regular, tipos de veículo) ficaria pra um onboarding do dono (hoje existe só o onboarding de cadastro com contrato, `onboarding-contrato-empresa` — sem catálogo/agenda/tipos de veículo); o admin-front só opera o dia a dia em cima disso (ativar/desativar serviço, registrar intercorrência pontual, ver veículos). Essa distinção guia o recorte de qualquer página nova que pareça "cadastro". **Exceção decidida depois** (`docs/plan/servicos-combos-catalogo`): a página `servicos` passou a criar/editar os serviços da loja, mas só como combos de itens de um catálogo global que o admin-front não altera — a loja escolhe o que oferece sem texto livre sobre o conteúdo.
11. **Login real por CNPJ + senha fixa, não "lembrar localmente"** (`docs/plan/selecao-empresa-admin-front`, confirmado com o usuário após 3 rodadas de correção) — a primeira ideia (dispositivo "lembra" qual empresa foi cadastrada nele, sem senha) foi descartada porque não permite login de outro aparelho; a segunda ideia (selecionar entre todas as empresas cadastradas, sem cadastro próprio) também foi descartada por confundir "selecionar empresa existente" com "onboarding/cadastro da própria empresa" (analogia usada: iFood dono da loja vs. iFood consumidor). Decisão final: cadastro (nome + endereço + CNPJ, sem pedir senha) com senha sempre fixada como `"admin"` no backend, e login de verdade (CNPJ + senha) contra o backend — funciona de qualquer aparelho, sem exigir um modelo de auth completo (JWT etc., fora de escopo).
12. ~~**`Veiculo` sem tabela própria no backend**~~ (`docs/plan/migrar-servicos-disponibilidade-veiculos-backend`) — **superada no I13**: o pedido aponta para o `Veiculo` do cliente (I3) e `GET /veiculos` lista os veículos distintos dos pedidos da empresa por essa relação.
13. **Services continuam buscando `lavaRapidoId` sozinhos, nunca recebendo por prop** (`docs/plan/migrar-servicos-disponibilidade-veiculos-backend`) — mesmo padrão que `pedidos.service.js` já usava (`getEmpresaLogadaId()` importado direto no `service.js`); nenhuma das páginas (`Servicos.jsx`/`Disponibilidade.jsx`/`Veiculos.jsx`) precisou mudar.
14. **Badge "Aberto"/"Fechado" + "Reabrir" no `AppShell.jsx`** (`docs/plan/isopen-intercorrencia-backend/`) — achado ao validar a task `servicos-disponibilidade-app-mobile`: `LavaRapido.isOpen` nunca refletia intercorrências cadastradas. Resolvido calculando `isOpen` no backend (ver `backend.specs.md` seção 5); o admin-front só exibe o que já vem calculado e oferece "Reabrir" (`PATCH /intercorrencias/:id { reaberta: true }`) pra reverter um fechamento automático manualmente. Quando o fechamento é por estar fora do horário (`foraDoHorario`, I19), mostra "Fora do horário de funcionamento" no lugar do motivo.
15. **Token de lava-rápido e senha própria (I17, `docs/plan/i17-acesso-seguro-painel/`)** — substitui a decisão 11 na parte da senha fixa: o cadastro pede e-mail + senha (mín. 8), o login/aceite devolvem um token guardado em `washaway:token` e enviado pelo `httpClient` em toda chamada; `401` volta ao Login com aviso. A decisão 13 continua para as leituras públicas; nas rotas de gestão a empresa vem do token.
16. **Exclusão da empresa só por solicitação (`docs/plan/i17-interno-exclusao/`)** — a empresa não se exclui sozinha: em "Minha empresa" ela solicita (motivo opcional), acompanha e pode cancelar enquanto está pendente; quem aprova e exclui é a equipe WashAway (usuário interno com permissão `admin`, só pela API/Swagger nesta sprint).
17. **Senha temporária com troca obrigatória (`docs/plan/i17-senha-gerada/`)** — entrar com a senha temporária (e-mail do onboarding, do "esqueci minha senha" ou da troca em massa) abre só a tela "Definir nova senha"; o token de troca fica em memória, nunca no `localStorage`. O "esqueci minha senha" é um modo do próprio Login (sem rota nova nem item na Sidebar).

## 12. Riscos/decisões ainda em aberto

- `docs/plan/painel-de-pedidos/painel-de-pedidos-v2.md` — script único para subir `mock-server` + dev server juntos, porta fixa do `json-server`, se os dois `db.json` (dev/teste) deveriam ser um só, fonte específica das fotos placeholder.
- `docs/plan/shell-sidebar-navegacao/shell-sidebar-navegacao.md` — nomes/agrupamento dos itens de menu da sidebar (hoje assumido um único grupo "Operação", sem indicação do usuário).
- `docs/plan/telas-servicos-disponibilidade-veiculos/telas-servicos-disponibilidade-veiculos.md` — depende de um "onboarding do dono do lava-rápido" (cadastro do catálogo de serviços, tipos de veículo, agenda regular) que ainda não existe em nenhum front; as 3 páginas novas (`servicos`/`disponibilidade`/`veiculos`) já usam o backend real (seed com dados por lava-rápido, ver `backend.specs.md` seção 3), mas continuam sem UI de cadastro/edição do catálogo em si — isso simula o onboarding já ter acontecido.

## Referências
- `CLAUDE.md` (raiz do repo) — status geral do projeto, atualizado a cada task.
- `WashAway/README.md` — anotações originais de escopo/personas do produto WashAway como um todo (não só admin-front).
- `docs/plan/` — planos de cada task, com o "Como" e "Por quê" detalhados.
- `docs/logs/` — o que foi de fato implementado em cada task (pode divergir do plano — checar "Desvios em relação ao plano" em cada log).
