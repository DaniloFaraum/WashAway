# app_mobile — Spec

> Documento de referência técnica do `app_mobile`, no padrão spec-driven development: descreve o que o projeto é, como está organizado hoje e quais problemas conhecidos existem. Diferente do `admin-front.specs.md`, este documento foi escrito a partir de **análise do código existente** (não de plans/decisões tomadas em conjunto com o autor) — várias seções abaixo são achados de auditoria, não convenções acordadas. Antes de mexer neste projeto, ler a seção 6 ("Nuances e problemas conhecidos") inteira.

## 1. Visão geral

`app_mobile` é o app do **consumidor final** do WashAway (persona "Mariana" — ver `WashAway/README.md`): busca lava-rápidos próximos, escolhe um, seleciona serviços e (futuramente) agenda/paga. É o par do `admin-front` (interface do dono do lava-rápido) — os dois devem eventualmente consumir o mesmo back-end, que ainda não existe em nenhum dos dois projetos.

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
- **Fontes**: `@expo-google-fonts/poppins` e `@expo-google-fonts/albert-sans`, carregadas via `useFonts` em `src/app/_layout.tsx`.
- **Ícones**: `lucide-react-native` (telas do produto) e `@expo/vector-icons` (Ionicons, usado em `index.tsx` e no template starter).
- Scripts: `npm start` (`expo start`), `npm run android`/`ios`/`web`, `npm run lint` (`expo lint`), `npm run reset-project` (script padrão do template Expo, não usado no fluxo normal).
- **Back-end real** (`WashAway/backend/`, ver `backend.specs.md`) como padrão das features `lava-rapidos`, `servicos` e `intercorrencias` (`BACKEND_API_BASE_URL`, porta 4000); `json-server` continua disponível como fallback manual e é quem roda nos testes (`globalSetup`). `detail.tsx` ainda não migrou e continua com mock local (achado #10 na seção 6, agora só parcial). ⚠️ `json-server@1.0.0-beta.15` (versão instalada) tem um bug confirmado: filtros por query string em campos terminados em `Id` (ex.: `?lavaRapidoId=`) sempre retornam vazio, mesmo com a sintaxe nova (`:eq=`, `_where`) — não afeta o backend real, só o fallback json-server/testes de qualquer endpoint que filtre por `lavaRapidoId` (os testes de `servicos`/`intercorrencias` contornam isso mockando `fetch` em vez de usar o json-server de teste).
- **Vitest** como test runner — só para a camada `service/model` (JS/TS puro, sem `react-native`), não para componentes/telas. Ver seção 4.1 e 3.2.

### 3.1 Como rodar

1. `cd app_mobile && npm install` (só na primeira vez, ou quando `package.json` mudar).
2. Suba o back-end de verdade (`WashAway/backend/`, ver `backend.specs.md`) em `http://localhost:4000` — é o padrão agora pra feature `lava-rapidos` (Home + onboarding). Pra usar o `json-server` como fallback manual: `npm run mock-server` (porta 3003) + `EXPO_PUBLIC_API_BASE_URL=http://localhost:3003`.
3. Em outro terminal (a partir da raiz do repo `washaway/WashAway/`): `python3 scripts/run.py --project app_mobile` (ou `cd app_mobile && npm start`) — abre o Metro Bundler.
4. No terminal do Metro, escolher a plataforma: `w` para abrir no navegador (web, `http://localhost:8081` por padrão), `a`/`i` para emulador Android/iOS, ou escanear o QR code com o app **Expo Go**. Também dá pra pedir direto: `python3 scripts/run.py --project app_mobile --web` (ou `npm run web`), `npm run android`, `npm run ios`.
5. Sem o passo 2 (algum back-end no ar em `BASE_URL`), a Home/onboarding ficam em loading indefinido / mostram erro de rede (buscam os lava-rápidos via `fetch`, sem fallback pra dado fixo).
6. No web, a aba "Mapa" da Home mostra uma mensagem de indisponibilidade em vez do mapa (ver seção 6, item 13) — pra ver o mapa de verdade é preciso rodar em Android/iOS (emulador ou Expo Go).

### 3.2 Como testar

- `python3 scripts/test.py --project app_mobile` (a partir de `WashAway/`) ou `cd app_mobile && npm run test` — roda a suíte Vitest. Sobe e derruba sozinho um `json-server` de teste (porta 3004, separada da de dev) via `globalSetup` — não precisa do passo manual do `mock-server`.
- Cobertura hoje: `src/features/lava-rapidos/service/lavaRapidos.service.test.ts`, `src/test/servicos.service.test.ts`, `src/test/intercorrencias.service.test.ts`, `src/test/useServicos.test.ts` (filtro de `ativo`), `src/test/useIntercorrencias.test.ts` (`diasAte`/`getIntercorrenciaRelevante`). `detail.tsx` continua sem teste.
- `npm run lint` (`expo lint`) continua disponível, mas não substitui teste.
- `python3 scripts/build.py --project app_mobile` (`expo export -p web`) valida o build estático de produção — não substitui os testes, mas pega erro de import/tipo que a suíte atual (só 1 teste) não cobre.

## 4. Organização de pastas

```
app_mobile/
├── mock-server/
│   └── db.json                   # dados da feature lava-rapidos (uso manual/dev)
├── src/
│   ├── app/                      # ROTAS REAIS (expo-router, convenção "src directory")
│   │   ├── _layout.tsx           # Stack raiz: (tabs) | servicos | disponibilidade | detail
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx       # renderiza <AppTabs /> (NativeTabs)
│   │   │   ├── index.tsx         # Home: busca/lista/mapa de lava-rápidos (consome lavaRapidos.service.ts)
│   │   │   └── explore.tsx       # tab "Explore" — boilerplate do template, não é produto (ver seção 6)
│   │   ├── servicos.tsx          # serviços do lava-rápido escolhido (backend real — migrado); categorias como filtro; banner de intercorrência
│   │   ├── disponibilidade.tsx   # lista as intercorrências futuras do lava-rápido (novo)
│   │   └── detail.tsx            # detalhe de um serviço (ainda com mock local — não migrou)
│   ├── features/
│   │   ├── lava-rapidos/
│   │   │   └── service/
│   │   │       ├── lavaRapidos.routes.ts    # endpoints
│   │   │       ├── lavaRapidos.model.ts     # forma dos dados + normalização
│   │   │       └── lavaRapidos.service.ts   # getLavaRapidos(), usa routes + model
│   │   ├── servicos/
│   │   │   ├── service/{servicos.routes,model,service}.ts   # getServicos(lavaRapidoId)
│   │   │   └── useServicos.ts               # hook + filtrarServicosAtivos() (só ativo: true)
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
│   │   ├── CarWashCard.tsx       # card de lava-rápido (usado na Home; `image` agora é URL, não `require()` local — ver seção 4.1)
│   │   ├── Header.js, VehicleBar.js, FooterCart.js   # usados em detail.tsx (FooterCart não é usado em lugar nenhum — ver seção 6)
│   │   ├── FilterModal.js        # arquivo vazio, não usado — ver seção 6
│   │   ├── colors.ts             # ⚠️ CÓPIA MORTA/desatualizada de constants/colors.ts — ver seção 6
│   │   ├── themed-text.tsx, themed-view.tsx, ui/collapsible.tsx, external-link.tsx, web-badge.tsx  # componentes do template starter (usados só por explore.tsx)
│   │   └── animated-icon.tsx / .web.tsx / .module.css   # splash screen animada
│   ├── constants/
│   │   ├── colors.ts             # paleta usada pelas telas do produto (Home/Servicos/Detail/CarWashCard/Header/VehicleBar/FooterCart)
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
- **Piloto**: `src/features/lava-rapidos/`, consumido por `(tabs)/index.tsx` (Home) e pelo onboarding. `src/features/servicos/` e `src/features/intercorrencias/` seguem o mesmo padrão, consumidos por `servicos.tsx`/`disponibilidade.tsx`. `detail.tsx` **ainda não migrou** — continua com mock local (achado #10 da seção 6 segue valendo só pra ela).
- **Back-end real por padrão** (`WashAway/backend/`, ver `backend.specs.md`): `lavaRapidos.service.ts`/`servicos.service.ts`/`intercorrencias.service.ts` usam `BACKEND_API_BASE_URL` (`http://localhost:4000`) como fallback quando `EXPO_PUBLIC_API_BASE_URL` não está definida. `json-server` (`npm run mock-server`, porta 3003) continua disponível como fallback manual (defina a env var pra usá-lo) e é quem roda automaticamente nos testes (`globalSetup`, porta 3004) — os testes não são afetados pela troca de padrão, exceto os de `servicos`/`intercorrencias` (mockam `fetch` por causa do bug do json-server citado na seção 3).
- Variável de ambiente do service: `process.env.EXPO_PUBLIC_API_BASE_URL` (convenção do Expo/Metro para inlinar env vars no bundle — **não** `import.meta.env`, que é específico do Vite/admin-front).
- Test runner: **Vitest** (não Jest/`jest-expo`) — só é possível porque `service.ts`/`model.ts`/`routes.ts` são TS puro, sem import de `react-native`/`expo-router`. Testar componentes/telas exigiria Jest + `jest-expo`, decisão maior, fora do escopo desse piloto.
- **Mudança de contrato do `image`**: a Home mockava `image` como `require('.../lava1.jpg')` (asset local, um número de módulo RN). Isso não é serializável em JSON/API — o `db.json`/fixture usam URLs (`https://placehold.co/...`) e `CarWashCard` passou a esperar `image: string` (`<Image source={{ uri: image }} />`) em vez de `ImageSourcePropType`. As imagens locais (`assets/images/lava*.jpg`) pararam de ser referenciadas pela Home.
- **Onboarding (escolha da empresa)**: `docs/plan/onboarding-lava-rapido/` implementou um fluxo restrito à escolha do lava-rápido (não confundir com um onboarding de conta/cadastro). `src/features/lava-rapidos/onboarding/empresaSelecionada.storage.ts` lê/grava o id escolhido via `@react-native-async-storage/async-storage` (chave `@washaway/empresaSelecionadaId`), e agora também expõe `clearEmpresaSelecionada()`. `src/app/_layout.tsx` usa o hook `useEmpresaSelecionadaGate` e navegação **imperativa** (`router.replace('/onboarding')` num `useEffect`) pra mandar pro onboarding quando nada foi escolhido ainda — **não** `<Redirect>` (ver achado de review: `<Redirect>` depende de `useFocusEffect`/`useNavigation`, cujo comportamento no layout raiz, fora de qualquer `Stack.Screen`, não é confiável). A escolha é local ao aparelho; a partir do `backend-mvp` (`WashAway/.specs/backend.specs.md`) os `id`s de lava-rápido escolhidos já vêm do mesmo Postgres que o `painel-pedidos` do admin-front usa — a escolha em si continua sem sincronizar com o backend (não existe conceito de conta/usuário ainda).
- **Trocar de lava-rápido** (`docs/plan/trocar-lava-rapido-app-mobile/`): a Home (`(tabs)/index.tsx`) tem um botão "Trocar lava-rápido" ao lado do botão de localização; toca → `Alert.alert` de confirmação → confirmando, `useEmpresaSelecionadaGate().trocarEmpresa()` limpa a escolha (`clearEmpresaSelecionada`) e `router.replace('/onboarding')` volta pro onboarding. Resolve a limitação que existia antes (só dava pra escolher uma vez, sem jeito de voltar).
- **Serviços e disponibilidade** (`docs/plan/servicos-disponibilidade-app-mobile/`): `servicos.tsx` migrou do mock local pro backend real (`GET /servicos?lavaRapidoId=`, usando o `id` já recebido via navegação, antes ignorado — achado #9 resolvido pra essa tela). `useServicos()` filtra só `ativo: true`. Card do serviço foi simplificado (`nome`/`categoria`/`preco`; sem `desc`/tempo, que não existem no model real; imagem é um placeholder fixo, não por serviço). A seção "Categorias" deixou de ser decorativa: agora é derivada dos valores distintos de `categoria` dos serviços retornados e funciona como filtro (toca de novo pra limpar). Tela nova `/disponibilidade` lista as intercorrências futuras do lava-rápido (`GET /intercorrencias?lavaRapidoId=`); `servicos.tsx` mostra um banner de aviso (com link pra essa tela) quando há intercorrência pra hoje ou pros próximos 3 dias (`getIntercorrenciaRelevante()` em `useIntercorrencias.ts`).
- **Endereço do lava-rápido em `servicos.tsx`**: `lavaRapidos.model.ts` ganhou o campo `address` (`string | null`); `lavaRapidos.service.ts` ganhou `getLavaRapido(id)` (`GET /lavaRapidos/:id`) e `useLavaRapido(id)` (novo hook, `src/features/lava-rapidos/useLavaRapido.ts`). `servicos.tsx` usa esse hook e mostra o endereço (com ícone de pin) logo abaixo do nome do lava-rápido no cabeçalho, quando existir — resolve o pedido do consumidor de saber onde fica a empresa antes de agendar. Dados de seed (`backend/prisma/seed.ts`) e o banco de dev foram atualizados com um endereço de exemplo (mesma rua/bairro/cidade, número diferente por lava-rápido) — antes todos tinham `address: null`.

## 5. Rotas e navegação

- `/onboarding` — primeira tela quando não há empresa (lava-rápido) escolhida ainda no aparelho (ver seção 4.1); lista simplificada (nome + distância) vinda de `getLavaRapidos()`, sem mapa/filtros/busca. Escolher navega para `/(tabs)` e não aparece mais nas próximas aberturas — a menos que o consumidor toque em "Trocar lava-rápido" na Home, que volta pra cá.
- `/(tabs)` → `AppTabs` (NativeTabs) com 2 abas: **Home** (`index.tsx`) e **Explore** (`explore.tsx`, boilerplate — seção 6).
- `/servicos` — recebe `id`/`nome` via `useLocalSearchParams` (passados pelo `CarWashCard` da Home ou pelo `Marker` do mapa). Busca os serviços reais do lava-rápido (`GET /servicos?lavaRapidoId=<id>`, só `ativo: true`); categorias filtram a lista; mostra banner de intercorrência relevante com link pra `/disponibilidade`.
- `/disponibilidade` — recebe `id`/`nome`; lista as intercorrências futuras do lava-rápido (`GET /intercorrencias?lavaRapidoId=<id>`), ordenadas por data.
- `/detail` — **não recebe nenhum parâmetro de navegação** apesar de `servicos.tsx` navegar com `router.push('/detail')`; mostra sempre o mesmo serviço hardcoded ("Lavagem Completa Premium"), independente do que foi selecionado em `servicos.tsx`. Ou seja, a navegação Serviços → Detalhe existe visualmente, mas os dados não fluem entre as duas telas (achado #9, ainda vale só pra `detail.tsx`).

## 6. Nuances e problemas conhecidos

Achados de leitura direta do código (não são convenções combinadas — são bugs/dívidas reais para triagem):

| # | Onde | O quê |
|---|---|---|
| 1 | ~~`src/components/app/**`~~ | ~~Cópia morta e não usada de toda a árvore `src/app/`~~ — **removida** em `docs/plan/servicos-disponibilidade-app-mobile/`. |
| 2 | `src/components/colors.ts` | Cópia morta e desatualizada de `src/constants/colors.ts` (faltam `star`/`success`/`danger`/`photoPlaceholder`, aspas duplas em vez de simples). Não é importada em lugar nenhum. Candidato a exclusão. |
| 3 | `src/components/FilterModal.js` | Arquivo **vazio** (0 bytes), não importado em lugar nenhum. `index.tsx` implementa seu próprio modal de filtro inline em vez de usar este componente. |
| 4 | `src/components/FooterCart.js` | Componente completo e funcional, mas **não é usado em nenhuma tela** — `servicos.tsx` reimplementa o mesmo rodapé de carrinho inline em vez de reaproveitá-lo. |
| 5 | `src/constants/colors.ts` vs. `src/constants/theme.ts` | Dois sistemas de cor paralelos que não se falam: `colors.ts` (paleta simples, usada por Home/Serviços/Detalhe/CarWashCard/Header/VehicleBar/FooterCart — as telas "do produto") e `theme.ts` (`Colors.light`/`Colors.dark` + `Spacing`, usado só pelo template starter do Expo: `explore.tsx`, `themed-text`/`themed-view`, `use-theme`, `app-tabs.tsx`). Não há dark mode nas telas do produto porque elas usam `colors.ts` (fixo), não `theme.ts` (com light/dark). |
| 6 | `VehicleBar.js`, `FooterCart.js` | Referenciam `colors.textGray`, `colors.textDark`, `colors.border` — **essas chaves não existem** em `src/constants/colors.ts` (que só tem `primary/secondary/background/neutralGray/white/black/star/success/danger/photoPlaceholder`). Resolve pra `undefined` em runtime — texto/borda ficam sem a cor pretendida, silenciosamente. |
| 7 | `Header.js`, `VehicleBar.js`, `FooterCart.js` | Usam nomes de fonte tipo `'Poppins-Bold'`, `'Poppins-Medium'`, `'AlbertSans-Regular'` (hífen) — mas as fontes são carregadas em `_layout.tsx` com os nomes `Poppins_700Bold`, `Poppins_500Medium`, `AlbertSans_400Regular` (formato do pacote `@expo-google-fonts/*`, com underscore). Os nomes não batem — essas fontes customizadas provavelmente **não estão sendo aplicadas** (cai no fallback do sistema). |
| 8 | `src/app/(tabs)/explore.tsx` | É o conteúdo padrão do template `create-expo-app` (tutorial sobre file-based routing, imagens, dark mode, animações) — não tem nenhuma relação com o produto WashAway. Nunca foi customizado nem removido. |
| 9 | Fluxo Serviços → Detalhe | `servicos.tsx` já usa o `id` real (resolvido, ver seção 4.1); `detail.tsx` continua sem receber nenhum parâmetro e mostra sempre o mesmo serviço hardcoded, independente do que foi selecionado em `servicos.tsx`. |
| 10 | `detail.tsx` | **Resolvido para `lava-rapidos` e `servicos`/`intercorrencias`** (ver seção 4.1). Só `detail.tsx` ainda declara array/objeto mockado local, sem tipo/modelo em comum e sem chamada de rede — migrar é trabalho futuro. |
| 11 | Tipagem mista | `Header.js`, `VehicleBar.js`, `FooterCart.js`, `FilterModal.js` são `.js` sem tipos; o resto do projeto é `.tsx` com `strict: true` no `tsconfig.json`. |
| 12 | ~~Comentários no código~~ | ~~`servicos.tsx` tinha comentários "*...do seu colega*"/"*...do seu amigo*", evidência de telas feitas em paralelo (PRs `I10-escolha-lavarapido` e `I6-selecao-servicos`, seção 8) e nunca integradas~~ — removidos ao migrar `servicos.tsx` (`docs/plan/servicos-disponibilidade-app-mobile/`). |
| 13 | `react-native-maps` | Só é `require`'d quando `Platform.OS !== 'web'` (`index.tsx`); no web a aba "Mapa" mostra uma mensagem de indisponibilidade em vez do mapa. Comportamento intencional, não é bug — só registrado aqui porque não é óbvio lendo o import estático. |

## 7. Páginas/rotas — status

| Rota | Tela | Status | Observação |
|---|---|---|---|
| `/onboarding` | `onboarding.tsx` | Funcional (via json-server real da feature `lava-rapidos`) | Só escolha da empresa; persistência local via AsyncStorage (seção 4.1). |
| `/(tabs)` → Home | `index.tsx` | Funcional (mock) | Busca por texto, filtros (aberto/avaliação/distância), toggle lista/mapa, localização via GPS ou endereço digitado. |
| `/(tabs)` → Explore | `explore.tsx` | Não é produto | Boilerplate do template Expo — achado #8. |
| `/servicos` | `servicos.tsx` | Funcional (backend real) | Usa o `id` recebido; categorias filtram; banner de intercorrência. |
| `/disponibilidade` | `disponibilidade.tsx` | Funcional (backend real) | Lista intercorrências futuras do lava-rápido. |
| `/detail` | `detail.tsx` | Funcional (mock, hardcoded) | Não recebe parâmetros — achado #9. |

## 8. Contexto de origem (branches/PRs mescladas)

Histórico relevante em `app_mobile/` (branch `main` do repo `WashAway`):
1. `b475f6b` — *"feat: adiciona estrutura inicial expo e tela de escolha de lava-rapido"* (PR `feat/I10-escolha-lavarapido`) — scaffold Expo + Home.
2. `9c6531c` — *"feat: integracao das telas de servicos e detalhes com fontes e dependencias"* (PR `feat/I6-selecao-servicos`) — telas de Serviços e Detalhe, fontes.
3. `767bae6` — *"feat: refatora os filtros, adiciona rotas de lavagem"* — em `feat/melhorias-ux-servicos`, branch remota **ainda não mesclada em `main`** até a data deste documento; conteúdo não incorporado aqui.

## 9. Referências
- `CLAUDE.md` (raiz do repo) — hoje só documenta o `admin-front`; não cobre `app_mobile`.
- `app_mobile/AGENTS.md` — aviso sobre a versão do Expo (ler antes de mexer em navegação/tabs).
- `WashAway/README.md` — persona do consumidor (Mariana) e escopo original do app mobile.
- `WashAway/.specs/admin-front.specs.md` — spec irmã, do lado do dono do lava-rápido; os dois projetos devem eventualmente falar com o mesmo back-end (ainda inexistente nos dois).
- `docs/plan/estrutura-app-mobile/` — plano e decisões por trás da convenção `service` por feature (seção 4.1), com o piloto `lava-rapidos`.
- `docs/logs/estrutura-app-mobile.md` — o que foi de fato implementado do plano acima.
- `docs/plan/trocar-lava-rapido-app-mobile/` — botão de trocar lava-rápido na Home.
- `docs/plan/servicos-disponibilidade-app-mobile/` — migração de `servicos.tsx` pro backend real + tela `/disponibilidade` (intercorrências).
