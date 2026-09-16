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
- Autenticação/autorização — ainda não definida em nenhuma task.
- Back-end real — ver seção 5, hoje é só simulado.

## 3. Stack e ferramental

- **React** com **Vite** (template `react`, JSX puro — sem TypeScript).
- **Material UI** (`@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`) como biblioteca de componentes. Usar componentes MUI em vez de CSS/HTML cru sempre que houver um componente equivalente.
- **react-router-dom** para roteamento entre páginas.
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

## 4. Organização de pastas — convenção obrigatória

O admin-front é organizado **por página**, não por camada técnica global. Essa é a convenção vigente (decidida e confirmada explicitamente pelo usuário — ver Log de decisões) e deve ser seguida por qualquer página nova.

```
src/
├── config/
│   └── featureFlags.js          # feature flags do projeto inteiro (ver seção 7)
├── components/                  # SÓ componentes reaproveitados por 2+ páginas (hoje vazio/inexistente)
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
├── App.jsx                      # layout raiz (AppBar) + <Routes>
└── main.jsx                     # bootstrap: ThemeProvider + CssBaseline + BrowserRouter
```

Regras derivadas dessa organização (aplicar em qualquer página nova):
1. **Uma página, uma pasta.** Tudo que só aquela página usa (componente principal, subcomponentes, service) mora dentro de `src/pages/<pagina>/`.
2. **`src/components/` é exceção, não regra.** Só criar/mover algo para lá quando um componente for genuinamente reaproveitado por 2 ou mais páginas. Não criar essa pasta "para o futuro" antecipadamente (YAGNI) — ela nasce quando o segundo uso aparece.
3. **`service/` sempre com 3 arquivos separados** (`*.routes.js`, `*.model.js`, `*.service.js`), nunca um único arquivo monolítico. Motivo: quando o back-end real existir, a migração fica isolada em `*.routes.js` (e possivelmente `*.model.js`), sem tocar em quem consome o service.
4. **`*.service.js` nunca hardcoda paths** — todo path vem de `*.routes.js`. Nunca hardcoda a forma do dado retornado sem passar por `*.model.js` (normalização).
5. **Nenhum mock estático solto** (ex.: um array em `src/mocks/`). Dado de exemplo vive no `db.json` do `json-server` (dev) ou nas fixtures de teste — a página sempre busca dado através do `service`, nunca de um array hardcoded no componente.

## 5. Back-end: hoje simulado com `json-server`

O back-end real do WashAway (mencionado no README, "composto por um back-end processando as reqs") **ainda não existe**. Enquanto isso:

- **Em desenvolvimento**: `npm run mock-server` sobe um `json-server` (v1 beta — CLI sem `--watch`, ver nota abaixo) na porta `3001`, servindo `admin-front/mock-server/db.json`. O dev precisa rodar esse comando **em paralelo** ao `npm run dev` (dois terminais) — não há script único que suba os dois juntos ainda.
- **Em teste**: cada suíte que testa um `service` sobe seu próprio `json-server` de teste via `globalSetup` do Vitest (`src/test/setup/globalSetup.js`), apontando para uma fixture isolada em `src/test/fixtures/`, numa porta diferente da de dev. O `globalSetup` sobe o servidor antes da suíte e derruba ao final — não precisa de passo manual para rodar `npm run test`.
- **Contrato assumido**: rotas REST padrão que o `json-server` gera a partir do `db.json` (`GET /recurso`, `GET /recurso/:id`, `PATCH /recurso/:id`, etc.). Isso é um contrato **provisório** — quando o back-end real existir, o contrato dele pode ser diferente (paginação, filtros, formato de erro), exigindo ajuste em `*.routes.js`/`*.model.js` do(s) service(s) afetado(s).
- **Nota sobre a versão do `json-server`**: a versão instalada (`^1.0.0-beta.15`) é a reescrita v1, com CLI diferente da v0 clássica — não tem flag `--watch` (recarrega sozinho) e normaliza `id` para string, além de injetar um campo `$schema` no `db.json` ao rodar. Isso é esperado, não é bug.
- **Base URL configurável**: cada `*.service.js` lê `import.meta.env.VITE_API_BASE_URL`, com fallback para `http://localhost:3001` (a porta do `mock-server` de dev). Isso é o que permite trocar para o back-end real só mudando uma env var, sem tocar em código.

## 6. Domínio conhecido até aqui

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

Outros conceitos do domínio, ainda sem página/implementação própria (ver README):
- **Serviço prestado**: nome, categoria, preço.
- **Disponibilidade**: horários em que o lava-rápido aceita pedidos.
- **Veículo**: cadastrado pelo consumidor (modelo, placa, etc.), referenciado pelo pedido.

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
| Painel de pedidos | `/` | `src/pages/painel-pedidos/` | Em implementação (task `painel-de-pedidos`, plano em `docs/plan/painel-de-pedidos/painel-de-pedidos-v2.md`) |
| Serviços/categorias/preços | — | — | Não iniciada |
| Disponibilidade | — | — | Não iniciada |
| Veículos | — | — | Não iniciada (veículo hoje só é exibido dentro do pedido, sem tela própria) |

## 9. Testes

- Runner: Vitest (`npm run test`, `--passWithNoTests` enquanto nem toda página tem teste ainda).
- Cobertura mínima esperada por `service`: pelo menos um teste que exercite `get*`/`update*` contra um `json-server` de teste real (não `fetch` mockado) — ver seção 5.
- `src/test/setup/globalSetup.js` é compartilhado; cada domínio usa sua própria fixture em `src/test/fixtures/` e sua própria porta, para não conflitar entre suítes.
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

## 12. Riscos/decisões ainda em aberto

Ver a seção "Riscos / decisões que ainda precisam de confirmação" do plano ativo mais recente (`docs/plan/painel-de-pedidos/painel-de-pedidos-v2.md`) para o que ainda não foi fechado — por exemplo, script único para subir `mock-server` + dev server juntos, porta fixa do `json-server`, e se os dois `db.json` (dev/teste) deveriam ser um só.

## Referências
- `CLAUDE.md` (raiz do repo) — status geral do projeto, atualizado a cada task.
- `WashAway/README.md` — anotações originais de escopo/personas do produto WashAway como um todo (não só admin-front).
- `docs/plan/` — planos de cada task, com o "Como" e "Por quê" detalhados.
- `docs/logs/` — o que foi de fato implementado em cada task (pode divergir do plano — checar "Desvios em relação ao plano" em cada log).
