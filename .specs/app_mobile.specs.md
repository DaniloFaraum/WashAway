# app_mobile — Spec

> Documento de referência técnica do `app_mobile`, no padrão spec-driven development: descreve o que o projeto é, como está organizado hoje e quais problemas conhecidos existem. Diferente do `admin-front.specs.md`, este documento foi escrito a partir de **análise do código existente** (não de plans/decisões tomadas em conjunto com o autor) — várias seções abaixo são achados de auditoria, não convenções acordadas. Antes de mexer neste projeto, ler a seção 6 ("Nuances e problemas conhecidos") inteira.

## 1. Visão geral

`app_mobile` é o app do **consumidor final** do WashAway (persona "Mariana" — ver `WashAway/README.md`): busca lava-rápidos próximos, escolhe um, seleciona serviços e (futuramente) agenda/paga. É o par do `admin-front` (interface do dono do lava-rápido) — os dois consomem o mesmo back-end (`WashAway/backend/`, ver `backend.specs.md`).

- **Stack**: Expo (React Native), com Expo Router para navegação por arquivo.
- **Estado atual**: protótipo de UI com dados mockados — nenhuma tela consome uma API real, e as telas não compartilham modelo de dados entre si (ver seção 6).

## 2. Escopo (conforme `WashAway/README.md`)

- Visualizar lava-rápidos próximos (lista e mapa), com localização via GPS ou endereço digitado.
- Selecionar um lava-rápido e ver seus serviços/preços/disponibilidade.
- Selecionar veículo previamente cadastrado.
- Adicionar fotos do veículo mostrando o estado de limpeza (ainda não implementado neste código).
- Fora de escopo: qualquer tela do dono do lava-rápido (isso é o `admin-front`).

## 3. Stack e ferramental

- **Expo SDK 57** (`expo: ~57.0.24`) — **muito recente**; `AGENTS.md` deste projeto avisa explicitamente: *"Expo HAS CHANGED — Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code."* Isso não é um aviso genérico: várias APIs usadas aqui (`expo-router/unstable-native-tabs`, `expo-glass-effect`, `expo-symbols`) são novas/instáveis nessa versão e mudam entre versões do Expo. Ler a doc da versão certa antes de alterar navegação/tabs.
- **React 19.2.3 / React Native 0.86.3**, **TypeScript** (`strict: true`, mas ver seção 6 sobre arquivos `.js` não tipados misturados no projeto).
- **Expo Router** (`expo-router: ~57.0.22`) para roteamento por arquivo, com **rotas tipadas** (`experiments.typedRoutes: true` no `app.json`) e **React Compiler** habilitado (`experiments.reactCompiler: true`).
- **NativeTabs** (`expo-router/unstable-native-tabs`, API ainda instável/unstable) para a tab bar nativa.
- **react-native-maps** (mapa de lava-rápidos próximos), **expo-location** (GPS + geocoding), **react-native-reanimated** + **react-native-gesture-handler** (animações).
- **Fontes**: `@expo-google-fonts/poppins` e `@expo-google-fonts/albert-sans`, carregadas via `useFonts` em `src/app/_layout.tsx`; `@expo-google-fonts/viga` (título da Home), carregada em `(tabs)/index.tsx` (veio do PR #4 / commit `559e72f`).
- **Ícones**: `lucide-react-native` (telas do produto) e `@expo/vector-icons` (Ionicons, usado em `index.tsx` e no template starter).
- Scripts: `npm start` (`expo start`), `npm run android`/`ios`/`web`, `npm run lint` (`expo lint`), `npm run reset-project` (script padrão do template Expo, não usado no fluxo normal).
- **Back-end real** (`WashAway/backend/`, ver `backend.specs.md`) como padrão das features `lava-rapidos`, `servicos` e `intercorrencias` (`BACKEND_API_BASE_URL`, porta 4000); `json-server` continua disponível como fallback manual e é quem roda nos testes (`globalSetup`). O detalhe do serviço (`servicos/[servicoId].tsx`) também usa o backend real (achado #10 resolvido no I21 parte 1). ⚠️ `json-server@1.0.0-beta.15` (versão instalada) tem um bug confirmado: filtros por query string em campos terminados em `Id` (ex.: `?lavaRapidoId=`) sempre retornam vazio, mesmo com a sintaxe nova (`:eq=`, `_where`) — não afeta o backend real, só o fallback json-server/testes de qualquer endpoint que filtre por `lavaRapidoId` (os testes de `servicos`/`intercorrencias` contornam isso mockando `fetch` em vez de usar o json-server de teste).
- **Vitest** como test runner — só para a camada `service/model` (JS/TS puro, sem `react-native`), não para componentes/telas. Ver seção 4.1 e 3.2.

### 3.1 Como rodar

1. `cd app_mobile && npm install` (só na primeira vez, ou quando `package.json` mudar).
2. Suba o back-end de verdade (`WashAway/backend/`, ver `backend.specs.md`) em `http://localhost:4000` — é o padrão agora (login/cadastro, Home e demais telas). Cliente de exemplo para entrar: `mariana@exemplo.com` / `123456` (criado por `npm run prisma:demo` no backend — só desenvolvimento). Pra usar o `json-server` como fallback manual: `npm run mock-server` (porta 3003) + `EXPO_PUBLIC_API_BASE_URL=http://localhost:3003`.
3. Em outro terminal (a partir da raiz do repo `washaway/WashAway/`): `python3 scripts/run.py --project app_mobile` (ou `cd app_mobile && npm start`) — abre o Metro Bundler.
4. No terminal do Metro, escolher a plataforma: `w` para abrir no navegador (web, `http://localhost:8081` por padrão), `a`/`i` para emulador Android/iOS, ou escanear o QR code com o app **Expo Go**. Também dá pra pedir direto: `python3 scripts/run.py --project app_mobile --web` (ou `npm run web`), `npm run android`, `npm run ios`.
5. Sem o passo 2 (algum back-end no ar em `BASE_URL`), o login/cadastro mostram erro de rede e a Home fica em loading indefinido / mostra erro de rede (buscam os lava-rápidos via `fetch`, sem fallback pra dado fixo).
6. No web, a aba "Mapa" da Home mostra uma mensagem de indisponibilidade em vez do mapa (ver seção 6, item 13) — pra ver o mapa de verdade é preciso rodar em Android/iOS (emulador ou Expo Go).

### 3.2 Como testar

- `python3 scripts/test.py --project app_mobile` (a partir de `WashAway/`) ou `cd app_mobile && npm run test` — roda a suíte Vitest. Sobe e derruba sozinho um `json-server` de teste (porta 3004, separada da de dev) via `globalSetup` — não precisa do passo manual do `mock-server`.
- Cobertura hoje: `src/test/lavaRapidos.service.test.ts`, `src/test/servicos.service.test.ts`, `src/test/intercorrencias.service.test.ts`, `src/test/useServicos.test.ts` (filtro de `ativo`), `src/test/useIntercorrencias.test.ts` (`diasAte`/`getIntercorrenciaRelevante`), `src/test/carrinho.test.ts` (`calcularCarrinho`, `formatarDuracao`, `formatarPreco`, `price` nullable) e `src/test/filtrarServicos.test.ts` (busca/categoria/preço/duração da tela de serviços). `src/test/servicosSelecionados.test.ts` cobre o carrinho compartilhado entre a lista e o detalhe do serviço. Conta do cliente (I1/I2, `fetch` mockado): `validarCadastro.test.ts`, `clientes.service.test.ts`, `auth.service.test.ts`, `httpClient.test.ts` e `tokenStorage.test.ts` (mocka `react-native`/`expo-secure-store` com `vi.mock`). As telas em si continuam sem teste.
- `npm run lint` (`expo lint`) continua disponível, mas não substitui teste.
- **Lugar na pirâmide do projeto** (estratégia completa em `backend.specs.md`, seção 6.1): o app testa services, hooks e funções puras (contra `json-server` de teste ou `fetch` mockado); regras de negócio e status HTTP são testados no backend. Sem testes de tela nesta sprint.
- **Cobertura:** `npm run test:coverage` gera relatório em `coverage/` (v8, só relatório, não bloqueia PR).
- **Convenção para as histórias:** cada critério "Testes automatizados: A, B, C" vira um `describe` com um `it` por caso citado, com o mesmo texto.
- **CI:** `.github/workflows/testes.yml` roda lint, `npm run test:coverage` e `npx tsc --noEmit` em todo PR e push na `main`. O lint está com `continue-on-error` porque a `main` ainda tem erros antigos de `expo lint`; tirar quando forem corrigidos.
- `python3 scripts/build.py --project app_mobile` (`expo export -p web`) valida o build estático de produção — não substitui os testes, mas pega erro de import/tipo que a suíte atual (só 1 teste) não cobre.

## 4. Organização de pastas

```
app_mobile/
├── mock-server/
│   └── db.json                   # dados da feature lava-rapidos (uso manual/dev)
├── src/
│   ├── app/                      # ROTAS REAIS (expo-router, convenção "src directory")
│   │   ├── _layout.tsx           # SessaoClienteProvider + gate de sessão; Stack raiz: (tabs) | login | cadastro | meus-dados | servicos | disponibilidade | servicos/[servicoId]
│   │   ├── login.tsx             # I2: login do cliente (params: email, expirada=1)
│   │   ├── cadastro.tsx          # I1: cadastro → entra logado
│   │   ├── meus-dados.tsx        # I2: nome e e-mail (GET /clientes/me), somente leitura
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx       # renderiza <AppTabs /> (NativeTabs)
│   │   │   ├── index.tsx         # Home: busca/lista/mapa de lava-rápidos (consome lavaRapidos.service.ts)
│   │   │   └── explore.tsx       # tab "Explore" — boilerplate do template, não é produto (ver seção 6)
│   │   ├── servicos.tsx          # serviços do lava-rápido escolhido (backend real — migrado); categorias como filtro; banner de intercorrência
│   │   ├── disponibilidade.tsx   # lista as intercorrências futuras do lava-rápido (novo)
│   │   └── servicos/[servicoId].tsx   # detalhe real do serviço (combo): itens, preço e duração; "Selecionar" marca no carrinho da lista (I21 parte 1)
│   ├── services/
│   │   └── httpClient.ts         # apiFetch (token + 401 → sessão expirada + ErroRede) — compartilhado
│   ├── features/
│   │   ├── auth/                 # I2
│   │   │   ├── service/{auth.routes,auth.service}.ts   # entrar(email, senha), me()
│   │   │   ├── SessaoClienteProvider.tsx   # contexto + useSessaoCliente()
│   │   │   ├── tokenStorage.ts   # expo-secure-store (nativo) / localStorage (só Expo web)
│   │   │   └── authStyles.ts     # estilos compartilhados de login/cadastro
│   │   ├── clientes/             # I1
│   │   │   ├── service/{clientes.routes,model,service}.ts   # cadastrarCliente + erros tipados
│   │   │   └── validarCadastro.ts   # validação do formulário (função pura)
│   │   ├── lava-rapidos/
│   │   │   └── service/
│   │   │       ├── lavaRapidos.routes.ts    # endpoints
│   │   │       ├── lavaRapidos.model.ts     # forma dos dados + normalização
│   │   │       └── lavaRapidos.service.ts   # getLavaRapidos(), usa routes + model
│   │   ├── servicos/
│   │   │   ├── service/{servicos.routes,model,service}.ts   # getServicos(lavaRapidoId)
│   │   │   ├── useServicos.ts               # hook + filtrarServicosAtivos() (só ativo: true)
│   │   │   └── servicosSelecionados.ts      # carrinho em memória compartilhado entre servicos.tsx e servicos/[servicoId].tsx (um lava-rápido por vez)
│   │   └── intercorrencias/
│   │       ├── service/{intercorrencias.routes,model,service}.ts   # getIntercorrencias(lavaRapidoId)
│   │       ├── useIntercorrencias.ts        # hook + diasAte()/getIntercorrenciaRelevante()
│   │       └── formatarData.ts              # formatarDataBR("YYYY-MM-DD" -> "DD/MM/AAAA")
│   ├── config/
│   │   └── api.ts                # DEV_API_BASE_URL (json-server, 3003) + BACKEND_API_BASE_URL (backend real, 4000, padrão)
│   ├── test/
│   │   ├── setup/                # globalSetup do Vitest (sobe/derruba json-server de teste, porta 3004)
│   │   ├── fixtures/              # db.json isolado para teste
│   │   ├── lavaRapidos.service.test.ts
│   │   ├── servicos.service.test.ts       # mocka fetch (ver nota sobre bug do json-server acima)
│   │   ├── intercorrencias.service.test.ts   # idem
│   │   ├── useServicos.test.ts
│   │   └── useIntercorrencias.test.ts
│   ├── components/
│   │   ├── app-tabs.tsx / .web.tsx   # definição da tab bar (NativeTabs)
│   │   ├── MenuConta.tsx         # I2: botão com a inicial do cliente no cabeçalho da Home → Meus dados / Sair
│   │   ├── CampoFormulario.tsx   # campo com rótulo + erro (login/cadastro)
│   │   ├── CarWashCard.tsx       # card de lava-rápido (usado na Home; `image` agora é URL, não `require()` local — ver seção 4.1)
│   │   ├── Header.tsx, VehicleBar.tsx   # migrados de .js no I21 parte 1 (fontes/cores corrigidas); hoje sem uso — guardados para o fluxo do I3/I13 (VehicleBar ainda mostra um carro fixo)
│   │   ├── themed-text.tsx, themed-view.tsx, ui/collapsible.tsx, external-link.tsx, web-badge.tsx  # componentes do template starter (usados só por explore.tsx)
│   │   └── animated-icon.tsx / .web.tsx / .module.css   # splash screen animada
│   ├── constants/
│   │   ├── colors.ts             # paleta usada pelas telas do produto (Home/Servicos/detalhe do serviço/CarWashCard/Header/VehicleBar); `border` adicionada no I21
│   │   └── theme.ts              # `Colors.light/dark` + `Spacing` — usado só pelo template starter (explore.tsx, themed-*, use-theme) — ver seção 6 (dois sistemas de cor não integrados)
│   ├── hooks/
│   │   ├── use-color-scheme.ts / .web.ts
│   │   └── use-theme.ts          # usa `constants/theme.ts`, não `constants/colors.ts`
│   └── global.css                # usado pelo template starter (web)
├── assets/                       # ícones, imagens do template Expo (as imagens mockadas lava1/2/3.jpg pararam de ser usadas pela Home — ver seção 4.1)
├── vitest.config.ts              # alias @/* + globalSetup + env EXPO_PUBLIC_API_BASE_URL de teste
├── app.json                      # config Expo (nome "tela-lava-rapido", permissão de localização, splash, plugins)
└── tsconfig.json                 # alias @/* -> src/*, @/assets/* -> assets/*
```

**Como o expo-router encontra as rotas**: não há pasta `app/` na raiz do projeto — o router usa a convenção "src directory" (procura `src/app/` quando não existe `app/` na raiz), disponível no Expo Router usado aqui (confirmado pelo próprio log do Metro: *"Using src/app as the root directory for Expo Router"*). `src/components/app/` (cópia morta de `src/app/`, achado #1 antigo desta seção) foi **removida** durante a migração de `servicos.tsx` (`docs/plan/servicos-disponibilidade-app-mobile/`) — nunca foi importada em lugar nenhum, era lixo de uma refatoração/merge anterior.

### 4.1 Convenção de `service` por feature (adaptada do admin-front, piloto)

`docs/plan/estrutura-app-mobile/` avaliou trazer a organização do `admin-front` (página dona do seu `service/routes/model`, testado contra `json-server`) para cá. Como o `app_mobile` usa **expo-router** (rotas por arquivo, não configuráveis em código), a convenção foi adaptada:

- Os arquivos em `src/app/*.tsx` continuam existindo e são a rota de verdade (exigência do expo-router) — mas viram consumidores finos de uma `feature` em `src/features/<nome>/`, que é quem tem o `service/` (mesmo padrão do admin-front: `routes.ts`+`model.ts`+`service.ts`).
- **Piloto**: `src/features/lava-rapidos/`, consumido por `(tabs)/index.tsx` (Home). `src/features/servicos/` e `src/features/intercorrencias/` seguem o mesmo padrão, consumidos por `servicos.tsx`/`disponibilidade.tsx`. O detalhe do serviço (`servicos/[servicoId].tsx`) reaproveita `useServicos` e acha o serviço pelo id (I21 parte 1); o antigo `detail.tsx` com mock local foi removido.
- **Back-end real por padrão** (`WashAway/backend/`, ver `backend.specs.md`): `lavaRapidos.service.ts`/`servicos.service.ts`/`intercorrencias.service.ts` usam `BACKEND_API_BASE_URL` (`http://localhost:4000`) como fallback quando `EXPO_PUBLIC_API_BASE_URL` não está definida. `json-server` (`npm run mock-server`, porta 3003) continua disponível como fallback manual (defina a env var pra usá-lo) e é quem roda automaticamente nos testes (`globalSetup`, porta 3004) — os testes não são afetados pela troca de padrão, exceto os de `servicos`/`intercorrencias` (mockam `fetch` por causa do bug do json-server citado na seção 3).
- Variável de ambiente do service: `process.env.EXPO_PUBLIC_API_BASE_URL` (convenção do Expo/Metro para inlinar env vars no bundle — **não** `import.meta.env`, que é específico do Vite/admin-front).
- Test runner: **Vitest** (não Jest/`jest-expo`) — só é possível porque `service.ts`/`model.ts`/`routes.ts` são TS puro, sem import de `react-native`/`expo-router`. Testar componentes/telas exigiria Jest + `jest-expo`, decisão maior, fora do escopo desse piloto.
- **Mudança de contrato do `image`**: a Home mockava `image` como `require('.../lava1.jpg')` (asset local, um número de módulo RN). Isso não é serializável em JSON/API — o `db.json`/fixture usam URLs (`https://placehold.co/...`) e `CarWashCard` passou a esperar `image: string` (`<Image source={{ uri: image }} />`) em vez de `ImageSourcePropType`. As imagens locais (`assets/images/lava*.jpg`) pararam de ser referenciadas pela Home.
- **Conta do cliente: cadastro, login e sessão** (I1 + I2, `docs/plan/i1-cadastro-cliente/` e `docs/plan/i2-login-cliente/`, entregues juntos):
  - **Fluxo**: o app abre no **login** quando não há sessão (link "Criar conta" → `/cadastro`). Cadastro ok → "Conta criada!" → login automático com as mesmas credenciais → Home. Login ok → Home.
  - **Gate de sessão** em `src/app/_layout.tsx`: `RootLayout` envolve tudo em `SessaoClienteProvider`; `RootNavigator` espera fontes + checagem da sessão e, num `useEffect`, usa navegação **imperativa** (`router.replace`, não `<Redirect>` — `<Redirect>` depende de `useFocusEffect`/`useNavigation`, cujo comportamento no layout raiz não é confiável): sem token fora de `login`/`cadastro` → `/login` (ou `/login?expirada=1`); com token em `login`/`cadastro` → `/(tabs)`. As telas não navegam sozinhas depois de entrar/sair — o gate faz isso.
  - **Sessão** (`features/auth/SessaoClienteProvider.tsx`, `useSessaoCliente()` → `{ cliente, token, carregando, expirada, entrar, sair }`): no boot lê o token salvo e valida com `GET /clientes/me` (401 → limpa; sem rede → mantém o token e `cliente` fica `null` até a próxima chamada). `entrar` grava o token; `sair` apaga.
  - **Token guardado** em `features/auth/tokenStorage.ts` (`getToken`/`setToken`/`limparToken`): `expo-secure-store` no celular (Keychain/Keystore, nunca AsyncStorage). **Limitação de desenvolvimento**: no Expo web o SecureStore não existe e o token fica no `localStorage` do navegador.
  - **`src/services/httpClient.ts`** (compartilhado — I3, I13, I18 usam nas rotas autenticadas): `apiFetch(path, init)` devolve o `Response` cru; injeta `Authorization: Bearer <token>` quando há sessão; põe `Content-Type: application/json` quando o body é string; falha de rede vira `ErroRede`; **401 de uma requisição que levou token** (qualquer tela) chama o handler da sessão (`registrarAoExpirarSessao`), que encerra a sessão e o gate leva para o login com "Sua sessão expirou". 401 sem token (ex.: senha errada no login) não dispara isso.
  - **Menu de conta**: o botão "Trocar lava-rápido" da Home virou `components/MenuConta.tsx` — círculo com a inicial do nome; abre "Meus dados" (`/meus-dados`, somente leitura) e "Sair". "Meus veículos" está pronto no menu, mas oculto (`MOSTRAR_MEUS_VEICULOS`) até a tela do I3.
  - **Onboarding de escolha de lava-rápido removido** (decisão do PO no I2): `onboarding.tsx`, `features/lava-rapidos/onboarding/` e a dependência `@react-native-async-storage/async-storage` saíram; a escolha do lava-rápido acontece na própria Home.
- **Serviços e disponibilidade** (`docs/plan/servicos-disponibilidade-app-mobile/`): `servicos.tsx` migrou do mock local pro backend real (`GET /servicos?lavaRapidoId=`, usando o `id` já recebido via navegação, antes ignorado — achado #9 resolvido pra essa tela). `useServicos()` filtra só `ativo: true`. Card do serviço foi simplificado (`nome`/`categoria`/`preco`; sem `desc`/tempo, que não existem no model real; imagem é um placeholder fixo, não por serviço). A seção "Categorias" deixou de ser decorativa: agora é derivada dos valores distintos de `categoria` dos serviços retornados e funciona como filtro (toca de novo pra limpar). Tela nova `/disponibilidade` lista as intercorrências futuras do lava-rápido (`GET /intercorrencias?lavaRapidoId=`); `servicos.tsx` mostra um banner de aviso (com link pra essa tela) quando há intercorrência pra hoje ou pros próximos 3 dias (`getIntercorrenciaRelevante()` em `useIntercorrencias.ts`).
- **Endereço do lava-rápido em `servicos.tsx`**: `lavaRapidos.model.ts` ganhou o campo `address` (`string | null`); `lavaRapidos.service.ts` ganhou `getLavaRapido(id)` (`GET /lavaRapidos/:id`) e `useLavaRapido(id)` (novo hook, `src/features/lava-rapidos/useLavaRapido.ts`). `servicos.tsx` usa esse hook e mostra o endereço (com ícone de pin) logo abaixo do nome do lava-rápido no cabeçalho, quando existir — resolve o pedido do consumidor de saber onde fica a empresa antes de agendar. Dados de seed (`backend/prisma/seed.ts`) e o banco de dev foram atualizados com um endereço de exemplo (mesma rua/bairro/cidade, número diferente por lava-rápido) — antes todos tinham `address: null`.
- **Horário de funcionamento em `servicos.tsx`** (I19 parte 1, `docs/plan/i19-horario-funcionamento/`): `LavaRapido` (`lavaRapidos.model.ts`) ganhou `horarios: { diaSemana, fechado, abertura, fechamento, definido }[]` (vem só em `GET /lavaRapidos/:id`; na listagem fica `[]`). Helper puro `src/features/lava-rapidos/formatarHorario.ts`: `formatarHorarioDoDia` ("08:00–18:00", "Fechado" ou "Horário não informado"), `resumirSemana` (agrupa dias seguidos a partir da segunda: "Seg a sex: 08:00–18:00", "Sáb: 08:00–12:00", "Dom: fechado"), `horarioDeHoje` (dia da semana no fuso fixo `America/Sao_Paulo`, via `diaSemanaNoFuso` — espelha o `FUSO_LAVA_RAPIDOS` do backend; se o backend for configurado com outro `TZ_LAVA_RAPIDOS`, mudar a constante do app também) e `temHorarioDefinido`. No cabeçalho, abaixo do endereço, aparece "Hoje: 08:00–18:00" (ícone de relógio); um toque expande/recolhe a semana. Sem nenhum dia definido, nada é mostrado. O ABERTO/FECHADO do card da Home continua vindo de `isOpen`, que agora o backend calcula com o horário de funcionamento. Testes: `src/test/formatarHorario.test.ts` e `src/test/lavaRapidos.model.test.ts` (normalização de `horarios`).
- **Serviços como combos de itens do catálogo** (`docs/plan/servicos-combos-catalogo/`): `Servico` (`servicos.model.ts`) perdeu `categoria` e ganhou `itens: { id, nome, categoria }[]` + `categorias: string[]` (derivadas dos itens, vindas do backend). O card em `servicos.tsx` mostra "Inclui: …" com os nomes dos itens no lugar da categoria; o filtro "Categorias" junta as `categorias` de todos os serviços e mostra os serviços que **contêm** a categoria escolhida.
- **Filtros da tela de serviços** (merge do PR #4 `feat/melhorias-ux-servicos` com `feature/fluxo-lava-rapido-onboard`, 2026-10-03): o PR #4 trouxe busca funcional, modal "Filtrar Serviços" (faixa de preço + tempo estimado máximo), `SafeAreaView`/insets e mensagem de lista vazia, mas sobre uma lista **mockada** de 3 serviços (com `routeName` para as páginas `lavagem-*`). No merge ficou a tela com **dados reais** e essas melhorias portadas para eles: `features/servicos/filtrarServicos.ts` filtra por busca (nome do serviço e dos itens, sem acento), categoria, preço e `duracaoMinutos`. Os tetos dos sliders acompanham os dados (`tetoDoFiltro`: mínimo R$ 300 / 2h, sobe se houver serviço mais caro/longo), e o máximo começa "sem limite". Os chips de "tipo de serviço" do PR #4 não foram portados (o filtro de categorias na própria tela já cobre isso), nem a navegação do card para `lavagem-*` (as 3 páginas mockadas foram removidas no I21 parte 1; o card agora abre o detalhe real `servicos/[servicoId]`).
- **Duração e carrinho** (`docs/plan/tempo-estimado-preco-servicos/`): `Servico` e seus itens têm `duracaoMinutos` (combo = soma dos itens, vem do backend). O card mostra "R$ X · ~40 min" (`utils/formatarPreco.ts` + `utils/formatarDuracao.ts`; o detalhe do serviço usa os mesmos). A tela abre **sem nenhum serviço pré-selecionado**; o rodapé soma preço e duração só dos selecionados (`features/servicos/calcularCarrinho.ts`, soma por combo nas duas contas).
- **Preço "a partir de"**: `LavaRapido.price` é `number | null`, calculado no backend (menor preço ativo). O card da Home e o marcador do mapa usam `formatarPrecoAPartirDe` (`features/lava-rapidos/`), que mostra "Sem serviços disponíveis" quando é `null`.

## 5. Rotas e navegação

- `/login` — primeira tela sem sessão (ver seção 4.1). Params opcionais: `email` (pré-preenche) e `expirada=1` (mostra "Sua sessão expirou"). "E-mail ou senha incorretos" no 401. Link "Criar conta" → `/cadastro`.
- `/cadastro` — nome, e-mail, senha e confirmação, com erro abaixo de cada campo; "Este e-mail já está cadastrado" com atalho "Entrar" (→ `/login?email=`); falha de rede mantém os campos e o botão vira "Tentar de novo". Sucesso → entra logado.
- `/meus-dados` — nome e e-mail do cliente (`GET /clientes/me`), aberta pelo menu de conta.
- `/(tabs)` → `AppTabs` (NativeTabs) com 2 abas: **Home** (`index.tsx`) e **Explore** (`explore.tsx`, boilerplate — seção 6).
- `/servicos` — recebe `id`/`nome` via `useLocalSearchParams` (passados pelo `CarWashCard` da Home ou pelo `Marker` do mapa). Busca os serviços reais do lava-rápido (`GET /servicos?lavaRapidoId=<id>`, só `ativo: true`); categorias filtram a lista; mostra banner de intercorrência relevante com link pra `/disponibilidade`.
- `/disponibilidade` — recebe `id`/`nome`; lista as intercorrências futuras do lava-rápido (`GET /intercorrencias?lavaRapidoId=<id>`), ordenadas por data.
- `/servicos/[servicoId]` — recebe `servicoId` + `id`/`nome` do lava-rápido; aberto ao tocar no texto do card em `/servicos`. Mostra nome, categorias, itens incluídos (nome, categoria, duração), preço e duração total. "Selecionar" marca o serviço no carrinho compartilhado (`features/servicos/servicosSelecionados.ts`) e volta para a lista (I21 parte 1; resolve o achado #9).

## 6. Nuances e problemas conhecidos

Achados de leitura direta do código (não são convenções combinadas — são bugs/dívidas reais para triagem):

| # | Onde | O quê |
|---|---|---|
| 1 | ~~`src/components/app/**`~~ | ~~Cópia morta e não usada de toda a árvore `src/app/`~~ — **removida** em `docs/plan/servicos-disponibilidade-app-mobile/`. |
| 2 | ~~`src/components/colors.ts`~~ | ~~Cópia morta e desatualizada de `src/constants/colors.ts`~~ — **removida** no I21 parte 1. |
| 3 | ~~`src/components/FilterModal.js`~~ | ~~Arquivo vazio, não importado~~ — **removido** no I21 parte 1. |
| 4 | ~~`src/components/FooterCart.js`~~ | ~~Componente não usado em nenhuma tela~~ — **removido** no I21 parte 1. |
| 5 | `src/constants/colors.ts` vs. `src/constants/theme.ts` | Dois sistemas de cor paralelos que não se falam: `colors.ts` (paleta simples, usada por Home/Serviços/detalhe do serviço/CarWashCard/Header/VehicleBar — as telas "do produto") e `theme.ts` (`Colors.light`/`Colors.dark` + `Spacing`, usado só pelo template starter do Expo: `explore.tsx`, `themed-text`/`themed-view`, `use-theme`, `app-tabs.tsx`). Não há dark mode nas telas do produto porque elas usam `colors.ts` (fixo), não `theme.ts` (com light/dark). |
| 6 | ~~`VehicleBar.js`, `FooterCart.js`~~ | ~~Chaves de cor inexistentes (`textGray`, `textDark`, `border`)~~ — **corrigido** no I21 parte 1 (`neutralGray`, `black`; `border: '#E5E7EB'` criada em `constants/colors.ts`). |
| 7 | ~~`Header.js`, `VehicleBar.js`, `FooterCart.js`~~ | ~~Nomes de fonte com hífen (`'Poppins-Bold'` etc.) que não batem com os carregados~~ — **corrigido** no I21 parte 1 (`Poppins_700Bold`, `Poppins_500Medium`, `AlbertSans_400Regular`). |
| 8 | `src/app/(tabs)/explore.tsx` | É o conteúdo padrão do template `create-expo-app` (tutorial sobre file-based routing, imagens, dark mode, animações) — não tem nenhuma relação com o produto WashAway. Nunca foi customizado nem removido. Pendente para o I18 / I21 parte 2. |
| 9 | ~~Fluxo Serviços → Detalhe~~ | ~~`detail.tsx` sem parâmetro, serviço hardcoded~~ — **resolvido** no I21 parte 1: `servicos/[servicoId].tsx` recebe o id e usa dados reais. |
| 10 | ~~`detail.tsx`~~ | ~~Mock local sem chamada de rede~~ — **resolvido**: `detail.tsx` e as páginas `lavagem-*`/`higienizacao-interna` foram removidos no I21 parte 1. |
| 11 | ~~Tipagem mista~~ | ~~`Header.js`, `VehicleBar.js`, `FooterCart.js`, `FilterModal.js` eram `.js`~~ — `Header`/`VehicleBar` migrados para `.tsx` e os outros dois removidos no I21 parte 1. |
| 12 | ~~Comentários no código~~ | ~~`servicos.tsx` tinha comentários "*...do seu colega*"/"*...do seu amigo*", evidência de telas feitas em paralelo (PRs `I10-escolha-lavarapido` e `I6-selecao-servicos`, seção 8) e nunca integradas~~ — removidos ao migrar `servicos.tsx` (`docs/plan/servicos-disponibilidade-app-mobile/`). |
| 13 | `react-native-maps` | Só é `require`'d quando `Platform.OS !== 'web'` (`index.tsx`); no web a aba "Mapa" mostra uma mensagem de indisponibilidade em vez do mapa. Comportamento intencional, não é bug — só registrado aqui porque não é óbvio lendo o import estático. |

## 7. Páginas/rotas — status

| Rota | Tela | Status | Observação |
|---|---|---|---|
| `/login` | `login.tsx` | Funcional (backend real) | Login do cliente (I2); primeira tela sem sessão. |
| `/cadastro` | `cadastro.tsx` | Funcional (backend real) | Cadastro (I1) → entra logado. |
| `/meus-dados` | `meus-dados.tsx` | Funcional (backend real) | Somente leitura (I2). |
| `/(tabs)` → Home | `index.tsx` | Funcional (backend real) | Lista de `GET /lavaRapidos` com "a partir de" calculado (ou "Sem serviços disponíveis"); busca por texto, filtros (aberto/avaliação/distância), toggle lista/mapa, localização via GPS ou endereço digitado; menu de conta (Meus dados / Sair). |
| `/(tabs)` → Explore | `explore.tsx` | Não é produto | Boilerplate do template Expo — achado #8. |
| `/servicos` | `servicos.tsx` | Funcional (backend real) | Usa o `id` recebido; card mostra itens incluídos, preço e duração; busca + categorias + modal de preço/tempo filtram; carrinho começa vazio e soma preço e duração; banner de intercorrência; horário de funcionamento de hoje no cabeçalho (toque expande a semana). |
| `/disponibilidade` | `disponibilidade.tsx` | Funcional (backend real) | Lista intercorrências futuras do lava-rápido. |
| `/servicos/[servicoId]` | `servicos/[servicoId].tsx` | Funcional (backend real) | Detalhe do serviço; "Selecionar" usa o mesmo carrinho da lista (I21 parte 1). `/detail` e `/lavagem-*`/`/higienizacao-interna` foram removidas. |

## 8. Contexto de origem (branches/PRs mescladas)

Histórico relevante em `app_mobile/` (branch `main` do repo `WashAway`):
1. `b475f6b` — *"feat: adiciona estrutura inicial expo e tela de escolha de lava-rapido"* (PR `feat/I10-escolha-lavarapido`) — scaffold Expo + Home.
2. `9c6531c` — *"feat: integracao das telas de servicos e detalhes com fontes e dependencias"* (PR `feat/I6-selecao-servicos`) — telas de Serviços e Detalhe, fontes.
3. `767bae6` — *"feat: refatora os filtros, adiciona rotas de lavagem"* (PR #4 `feat/melhorias-ux-servicos`, mesclado em `main`) + `559e72f` *"mudando a fonte do título"* (fonte Viga).
4. Merge de `feature/fluxo-lava-rapido-onboard` em `main` (2026-10-03): onboarding/troca de lava-rápido, migração para o backend real, serviços como combos, duração e preço calculado. Conflitos resolvidos em `_layout.tsx` (gate de onboarding + rotas `lavagem-*`), `(tabs)/index.tsx` (dados reais + fonte Viga) e `servicos.tsx` (ver seção 4.1).

## 9. Referências
- `CLAUDE.md` (raiz do repo) — hoje só documenta o `admin-front`; não cobre `app_mobile`.
- `app_mobile/AGENTS.md` — aviso sobre a versão do Expo (ler antes de mexer em navegação/tabs).
- `WashAway/README.md` — persona do consumidor (Mariana) e escopo original do app mobile.
- `WashAway/.specs/admin-front.specs.md` — spec irmã, do lado do dono do lava-rápido; os dois projetos falam com o mesmo back-end (`backend.specs.md`).
- `docs/plan/estrutura-app-mobile/` — plano e decisões por trás da convenção `service` por feature (seção 4.1), com o piloto `lava-rapidos`.
- `docs/logs/estrutura-app-mobile.md` — o que foi de fato implementado do plano acima.
- `docs/plan/trocar-lava-rapido-app-mobile/` — botão de trocar lava-rápido na Home (substituído pelo menu de conta no I2).
- `docs/plan/i1-cadastro-cliente/`, `docs/plan/i2-login-cliente/` — cadastro, login, sessão e `httpClient`.
- `docs/plan/servicos-disponibilidade-app-mobile/` — migração de `servicos.tsx` pro backend real + tela `/disponibilidade` (intercorrências).
