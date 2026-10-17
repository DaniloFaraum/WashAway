# Arquitetura do WashAway (2026-10-17)

Situação na `main` depois das ondas 1 a 6 da sprint (I1, I2, I3, I9, I13, I15, I17 completo, I18, I19, I20 e I21).

## Visão geral

```mermaid
flowchart LR
    subgraph Usuarios["Pessoas"]
        Dono["Dono do lava-rápido"]
        Cliente["Cliente (consumidor)"]
        Equipe["Equipe interna"]
    end

    subgraph Front["Front-ends"]
        Admin["admin-front<br/>Wash Your Way — Painel<br/>Vite + React + MUI<br/>:5173"]
        App["app_mobile<br/>Expo Router (web :8081)"]
    end

    subgraph Back["backend — Express + Prisma (:4000)"]
        Auth["auth/token.ts<br/>JWT (tipo + escopo)"]
        MW["middlewares<br/>autenticar(tipo) · autorizar(permissão)<br/>limiteTentativas"]
        Rotas["Rotas REST<br/>(ver diagrama abaixo)"]
        Disp["horarios/disponibilidade.service<br/>estaAberto · listarAbertos"]
        Docs["/api-docs<br/>Swagger"]
    end

    subgraph Dados["Docker (backend/docker-compose.yml)"]
        PG[("PostgreSQL 16<br/>washaway (dev)<br/>washaway_test_N (testes)")]
        PGA["pgAdmin"]
    end

    Worker["scripts/email_worker.py<br/>worker de e-mail (Python)"]
    Emails[".emails/*.eml (dev)<br/>ou SMTP (produção)"]
    ViaCEP["ViaCEP<br/>(consulta de CEP)"]

    Dono --> Admin
    Cliente --> App
    Equipe -- "Swagger (sem tela própria)" --> Docs
    Admin -- "HTTP + Bearer token<br/>(washaway:token)" --> Rotas
    App -- "apiFetch + Bearer token" --> Rotas
    Admin -. "onboarding" .-> ViaCEP
    Rotas --> MW --> Auth
    Rotas --> Disp
    Rotas -- Prisma --> PG
    PGA --> PG
    Rotas -- "INSERT EventoEmail<br/>+ NOTIFY email_pendente" --> PG
    PG -- "LISTEN + varredura<br/>FOR UPDATE SKIP LOCKED" --> Worker
    Worker --> Emails
```

## Ciclo de um pedido

```mermaid
sequenceDiagram
    actor C as Cliente (app)
    participant B as backend
    actor D as Dono (painel)

    C->>B: GET /lavaRapidos?horario=… (I9, só os abertos)
    C->>B: POST /pedidos { lavaRapidoId, veiculoId, servicoIds, horario }
    Note over B: preço e duração calculados no servidor<br/>nome/preço de cada serviço congelados (PedidoServico)<br/>validarHorarioPedido → estaAberto (I20)
    B-->>C: 201 pendente · ou 400 HORARIO_INDISPONIVEL
    D->>B: GET /pedidos ("Aguardando sua resposta")
    D->>B: PATCH /pedidos/:id { status: aceito | recusado, motivo? } (I15)
    C->>B: GET /clientes/me/pedidos · /clientes/me/notificacoes (I18)
    C->>B: POST /clientes/me/pedidos/:id/visto (zera o contador de recusas)
```

Status do pedido: `pendente → aceito | recusado`, e `aceito → em_andamento → concluido`. Transição inválida → `409 TRANSICAO_INVALIDA`.

## Rotas do backend e quem pode chamar

```mermaid
flowchart TB
    subgraph Publicas["Públicas"]
        P1["GET /lavaRapidos (?horario=) · /lavaRapidos/:id<br/>GET /lavaRapidos/:id/horarios"]
        P2["GET /servicos · /itensServico · /intercorrencias"]
        P3["GET /contratos/vigente"]
        P4["POST /onboarding/solicitacoes ⏱<br/>(+ aceite de contrato → senha gerada por e-mail)"]
        P5["POST /lavaRapidos/login ⏱<br/>POST /auth/lava-rapido/esqueci-senha ⏱"]
        P6["POST /auth/cliente/cadastro ⏱<br/>POST /auth/cliente/login ⏱"]
        P7["POST /auth/interno/login ⏱"]
    end

    subgraph Painel["Token tipo lavaRapido (empresa vem do token)"]
        L1["GET /pedidos · PATCH /pedidos/:id (aceite/recusa)"]
        L2["POST/PUT/PATCH /servicos"]
        L3["POST/PATCH /intercorrencias"]
        L4["PUT /lavaRapidos/:id/horarios"]
        L5["GET /veiculos (dos pedidos)"]
        L6["POST/GET/DELETE<br/>/lavaRapidos/me/solicitacao-exclusao"]
        L7["POST /auth/lava-rapido/trocar-senha<br/>(aceita o escopo trocar-senha)"]
    end

    subgraph ClienteR["Token tipo cliente (cliente vem do token)"]
        C1["GET /clientes/me"]
        C2["GET/POST/PUT/DELETE<br/>/clientes/me/veiculos"]
        C3["POST /pedidos"]
        C4["GET /clientes/me/pedidos · /:id<br/>POST /clientes/me/pedidos/:id/visto<br/>GET /clientes/me/notificacoes"]
    end

    subgraph InternoR["Token tipo interno + autorizar('admin')"]
        I1["GET /interno/solicitacoes-exclusao<br/>POST /:id/aprovar · /:id/recusar"]
    end

    Admin["admin-front"] --> P3 & P4 & P5
    Admin --> Painel
    App["app_mobile"] --> P1 & P2 & P6
    App --> ClienteR
    Swagger["equipe via /api-docs"] --> P7 & InternoR
```

⏱ = limite de tentativas (responde 429 com `Retry-After`).
Token ausente ou inválido → 401; tipo errado, escopo `trocar-senha` fora da troca ou falta de permissão → 403; recurso de outra empresa/cliente → 404.

## Modelo de dados (Prisma)

```mermaid
erDiagram
    LavaRapido ||--o{ Pedido : recebe
    LavaRapido ||--o{ Servico : oferece
    LavaRapido ||--o{ Intercorrencia : registra
    LavaRapido ||--o{ HorarioFuncionamento : "abre em"
    LavaRapido |o--o{ SolicitacaoExclusao : "pede"
    Servico ||--o{ ServicoItem : compoe
    ItemServico ||--o{ ServicoItem : "faz parte"
    Cliente ||--o{ Veiculo : possui
    Cliente ||--o{ Pedido : faz
    Veiculo ||--o{ Pedido : "vai em"
    Pedido ||--|{ PedidoServico : contem
    Servico |o--o{ PedidoServico : "origem"
    Contrato ||--o{ SolicitacaoOnboarding : "aceito em"
    SolicitacaoOnboarding |o--o| LavaRapido : "vira (ao aceitar)"
    UsuarioInterno |o--o{ SolicitacaoExclusao : decide
    Pedido {
        enum status "pendente aceito recusado em_andamento concluido"
        float precoTotal
        int duracaoMinutos
        datetime statusAlteradoEm
        string motivoRecusa
        datetime recusaVistaEm
    }
    PedidoServico {
        string nome "congelado na compra"
        float preco "congelado na compra"
        int duracaoMinutos
    }
    LavaRapido {
        string cnpj "único"
        string email "único"
        string senha "hash"
        string senhaGerada "hash temporário"
    }
    EventoEmail {
        enum tipo "senha_gerada esqueci_senha exclusao_*"
        string destinatario
        enum status "pendente | enviado | erro"
    }
```

Observações:
- `Pedido → Cliente/Veiculo` usa `onDelete: Restrict`: veículo com pedido não pode ser apagado (`409`), para o histórico do lava-rápido não sumir. Os pedidos antigos foram convertidos pela migration `20261017120000_pedido_cliente_servicos` sem apagar nenhum.
- `SolicitacaoExclusao` guarda nome, CNPJ e e-mail da empresa e sobrevive à exclusão (que apaga o `LavaRapido` em cascata).
- `EventoEmail` é a outbox: gravada na mesma transação da ação que gera o e-mail.
- Fuso fixo `America/Sao_Paulo` (`src/utils/fusoHorario.ts`) para horário de funcionamento, validação de pedido e busca.

## Telas

```mermaid
flowchart LR
    subgraph AdminTelas["admin-front (src/)"]
        AL["login/Login · EsqueciSenha<br/>DefinirNovaSenha (troca obrigatória)<br/>OnboardingContrato"] --> Shell["AppShell + Sidebar"]
        Shell --> PP["pages/painel-pedidos<br/>(Aguardando sua resposta · aceitar/recusar)"]
        Shell --> PS["pages/servicos"]
        Shell --> PD["pages/disponibilidade<br/>(horário editável · intercorrências)"]
        Shell --> PV["pages/veiculos"]
        Shell --> PM["pages/minha-empresa<br/>(pedido de exclusão)"]
    end

    subgraph AppTelas["app_mobile (src/app/)"]
        ALog["login · cadastro"] --> Home["(tabs)/index — Home<br/>filtro 'Quando?' + MenuConta (contador de recusas)"]
        Home --> Serv["servicos · servicos/[servicoId]"]
        Serv --> PV1["pedido/veiculo"] --> PDH["pedido/data-hora"] --> PR["pedido/resumo"] --> PE["pedido/enviado"]
        Home --> Disp["disponibilidade"]
        Home --> MP["(tabs)/pedidos — Meus pedidos<br/>Próximos · Anteriores · Recusados"] --> PDet["pedidos/[id]"]
        Home --> MD["meus-dados"]
        Home --> MV["veiculos/index"] --> VF["veiculos/form"]
    end
```

## Ferramentas de desenvolvimento

| Script | O que faz |
|---|---|
| `scripts/restart.py [--project X]` | Reinicia backend, admin, app e worker (logs em `/tmp/washaway-*.log`) |
| `scripts/test.py --project all\|backend\|admin-front\|app_mobile\|email-worker` | Roda as suítes de teste (backend 514, admin-front 63, app_mobile 155) |
| `npm run prisma:demo` (backend) | Insere dados de demonstração sem apagar nada (inclui o interno `dev@washaway.dev`) |
| `npm run interno:criar -- --email … --permissoes admin` (backend) | Cria um usuário interno |
| `npm run senhas:troca-em-massa` (backend) | Troca, uma vez, a senha `admin` das empresas antigas por senha gerada enviada por e-mail |
