const erroSchema = {
  type: 'object',
  properties: { error: { type: 'string' } },
  required: ['error'],
}

const lavaRapidoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    address: { type: 'string', nullable: true },
    cnpj: { type: 'string' },
    rating: { type: 'number' },
    reviewsCount: { type: 'integer' },
    distance: { type: 'string' },
    time: { type: 'string' },
    price: { type: 'number', nullable: true, description: 'Calculado ("a partir de"): menor preço entre os serviços ativos; null sem serviço ativo.' },
    isOpen: { type: 'boolean', description: 'Calculado: coluna do banco E sem intercorrência ativa agora.' },
    image: { type: 'string' },
    latitude: { type: 'number' },
    longitude: { type: 'number' },
  },
}

const intercorrenciaSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    lavaRapidoId: { type: 'string' },
    data: { type: 'string', example: '2026-10-12', description: 'Formato YYYY-MM-DD.' },
    motivo: { type: 'string' },
    diaInteiro: { type: 'boolean' },
    horaInicio: { type: 'string', nullable: true, example: '14:00' },
    horaFim: { type: 'string', nullable: true, example: '16:00' },
    reaberta: { type: 'boolean' },
  },
}

const contratoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    versao: { type: 'integer' },
    titulo: { type: 'string' },
    conteudo: { type: 'string' },
    vigente: { type: 'boolean' },
    criadoEm: { type: 'string', format: 'date-time' },
  },
}

const solicitacaoOnboardingSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    address: { type: 'string', nullable: true },
    cnpj: { type: 'string' },
    email: { type: 'string', format: 'email', nullable: true, description: 'E-mail de acesso (normalizado). null só em solicitações anteriores ao I17.' },
    status: { type: 'string', enum: ['aguardando_contrato', 'concluida'] },
    contratoId: { type: 'string' },
    aceitoEm: { type: 'string', format: 'date-time', nullable: true },
    lavaRapidoId: { type: 'string', nullable: true },
    criadoEm: { type: 'string', format: 'date-time' },
    contrato: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        versao: { type: 'integer' },
        titulo: { type: 'string' },
        conteudo: { type: 'string' },
      },
    },
  },
}

const horarioDiaSchema = {
  type: 'object',
  properties: {
    diaSemana: { type: 'integer', minimum: 0, maximum: 6, description: '0 = domingo … 6 = sábado.' },
    fechado: { type: 'boolean' },
    abertura: { type: 'string', nullable: true, example: '08:00', description: '"HH:mm", hora local (America/Sao_Paulo).' },
    fechamento: { type: 'string', nullable: true, example: '18:00', description: '"HH:mm", hora local (America/Sao_Paulo).' },
    definido: { type: 'boolean', description: 'false = dia sem horário cadastrado (sem restrição: só intercorrências fecham).' },
  },
}

const lavaRapidoDetalheSchema = {
  allOf: [
    lavaRapidoSchema,
    {
      type: 'object',
      properties: {
        intercorrenciaAtiva: {
          ...intercorrenciaSchema,
          nullable: true,
        },
        foraDoHorario: { type: 'boolean', description: 'true quando está fechado agora por estar fora do horário de funcionamento.' },
        horarios: { type: 'array', items: horarioDiaSchema, description: 'Os 7 dias da semana, na ordem 0 a 6.' },
      },
    },
  ],
}

const pedidoSchema = {
  type: 'object',
  description: 'Pedido (I13): cliente e veículo do cadastro, serviços comprados com nome/preço/duração congelados no momento da compra; total e duração calculados no servidor.',
  properties: {
    id: { type: 'string' },
    lavaRapidoId: { type: 'string' },
    clienteId: { type: 'string' },
    veiculoId: { type: 'string' },
    horario: { type: 'string', format: 'date-time', description: 'Início do atendimento (UTC).' },
    status: {
      type: 'string',
      enum: ['pendente', 'aceito', 'recusado', 'em_andamento', 'concluido'],
      description: 'Fluxo (I15): pendente → aceito ou recusado; aceito → em_andamento → concluido.',
    },
    statusAlteradoEm: { type: 'string', format: 'date-time', nullable: true, description: 'Última mudança de status (I15); null se nunca mudou.' },
    motivoRecusa: { type: 'string', nullable: true, description: 'Motivo informado ao recusar (I15), até 200 caracteres.' },
    fotos: { type: 'array', items: { type: 'string' } },
    precoTotal: { type: 'number', description: 'Soma dos preços dos serviços, calculada no servidor.' },
    duracaoMinutos: { type: 'integer', description: 'Soma das durações dos serviços, calculada no servidor.' },
    criadoEm: { type: 'string', format: 'date-time' },
    cliente: { type: 'object', properties: { id: { type: 'string' }, nome: { type: 'string' } } },
    veiculo: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        marca: { type: 'string', nullable: true },
        modelo: { type: 'string' },
        cor: { type: 'string' },
        placa: { type: 'string' },
      },
    },
    servicos: {
      type: 'array',
      description: 'Serviços comprados, na ordem da escolha (snapshot: mudar o serviço depois não altera o pedido).',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          servicoId: { type: 'string', nullable: true, description: 'Serviço de origem (null se ele foi apagado).' },
          nome: { type: 'string' },
          preco: { type: 'number' },
          duracaoMinutos: { type: 'integer' },
        },
      },
    },
  },
}

const novoPedidoSchema = {
  type: 'object',
  required: ['lavaRapidoId', 'veiculoId', 'servicoIds', 'horario'],
  description: 'O cliente vem do token. Qualquer outro campo (preço, duração, status, clienteId…) é ignorado.',
  properties: {
    lavaRapidoId: { type: 'string' },
    veiculoId: { type: 'string', description: 'Veículo do próprio cliente (/clientes/me/veiculos).' },
    servicoIds: { type: 'array', minItems: 1, maxItems: 20, uniqueItems: true, items: { type: 'string' } },
    horario: { type: 'string', format: 'date-time', example: '2026-10-20T10:00:00-03:00', description: 'ISO 8601 com fuso (Z ou ±HH:mm), no futuro.' },
  },
}

const erroPedidoSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    codigo: {
      type: 'string',
      enum: ['DADOS_INVALIDOS', 'HORARIO_PASSADO', 'HORARIO_INDISPONIVEL', 'SERVICO_INVALIDO', 'LAVA_RAPIDO_NAO_ENCONTRADO', 'VEICULO_NAO_ENCONTRADO'],
    },
    servicoIdsInvalidos: { type: 'array', items: { type: 'string' }, description: 'Só em SERVICO_INVALIDO.' },
  },
}

const erroStatusPedidoSchema = {
  type: 'object',
  description: 'Recusa do PATCH /pedidos/:id (I15).',
  properties: {
    error: { type: 'string', example: 'Não é possível mudar de recusado para aceito.' },
    codigo: { type: 'string', enum: ['DADOS_INVALIDOS', 'PEDIDO_NAO_ENCONTRADO', 'TRANSICAO_INVALIDA'] },
  },
}

const servicoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    lavaRapidoId: { type: 'string' },
    nome: { type: 'string' },
    preco: { type: 'number' },
    ativo: { type: 'boolean' },
    itens: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, nome: { type: 'string' }, categoria: { type: 'string' }, duracaoMinutos: { type: 'integer' } },
      },
    },
    categorias: { type: 'array', items: { type: 'string' }, description: 'Derivadas (distintas) dos itens do combo.' },
    duracaoMinutos: { type: 'integer', description: 'Derivada: soma da duração dos itens do combo.' },
  },
}

const itemServicoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    nome: { type: 'string' },
    descricao: { type: 'string' },
    categoria: { type: 'string' },
    duracaoMinutos: { type: 'integer', description: 'Duração estimada do item, em minutos.' },
    ativo: { type: 'boolean' },
  },
}

const dadosServicoProperties = {
  nome: { type: 'string', maxLength: 60 },
  preco: { type: 'number', exclusiveMinimum: 0 },
  itemIds: { type: 'array', minItems: 1, items: { type: 'string' }, description: 'Ids de itens ativos do catálogo (GET /itensServico), sem repetição.' },
}

const veiculoSchema = {
  type: 'object',
  description: 'Veículo de um pedido da empresa (painel, I13).',
  properties: {
    id: { type: 'string' },
    marca: { type: 'string', nullable: true },
    modelo: { type: 'string' },
    cor: { type: 'string' },
    placa: { type: 'string' },
  },
}

const veiculoClienteSchema = {
  type: 'object',
  description: 'Veículo do cliente do app (I3). Não confundir com `Veiculo`, que o painel deriva dos pedidos.',
  properties: {
    id: { type: 'string' },
    clienteId: { type: 'string' },
    marca: { type: 'string', nullable: true },
    modelo: { type: 'string' },
    cor: { type: 'string' },
    placa: { type: 'string', description: 'Normalizada: sem hífen/espaços e em maiúsculas (ex.: ABC1234 ou ABC1D23).' },
    criadoEm: { type: 'string', format: 'date-time' },
  },
}

const dadosVeiculoClienteSchema = {
  type: 'object',
  required: ['modelo', 'cor', 'placa'],
  properties: {
    marca: { type: 'string', nullable: true, maxLength: 60, description: 'Opcional; vazia vira null.' },
    modelo: { type: 'string', maxLength: 60 },
    cor: { type: 'string', maxLength: 60 },
    placa: { type: 'string', description: 'Formato antigo (ABC-1234) ou Mercosul (ABC1D23); hífen, espaços e caixa são ignorados.' },
  },
}

const erroVeiculoClienteSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    campos: {
      type: 'object',
      description: 'Mensagem por campo inválido.',
      properties: { marca: { type: 'string' }, modelo: { type: 'string' }, cor: { type: 'string' }, placa: { type: 'string' } },
    },
  },
  required: ['error'],
}

const lavaRapidoIdParam = {
  name: 'lavaRapidoId',
  in: 'query',
  required: false,
  schema: { type: 'string' },
  description: 'Filtra pela empresa dona do recurso.',
}

const clienteSchema = {
  type: 'object',
  description: 'Cliente do app (nunca inclui a senha).',
  properties: {
    id: { type: 'string' },
    nome: { type: 'string' },
    email: { type: 'string', format: 'email', description: 'Sempre normalizado (sem espaços nas pontas, minúsculas).' },
    criadoEm: { type: 'string', format: 'date-time' },
  },
}

const loginClienteSchema = {
  type: 'object',
  properties: {
    token: { type: 'string', description: 'JWT HS256 — enviar como `Authorization: Bearer <token>`.' },
    expiraEm: { type: 'string', format: 'date-time', description: 'Fim da validade do token (JWT_EXPIRES_IN, padrão 7 dias).' },
    cliente: { $ref: '#/components/schemas/Cliente' },
  },
}

const erroCadastroClienteSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    campos: {
      type: 'object',
      description: 'Mensagem por campo inválido. Ausente quando o corpo nem é um JSON válido.',
      properties: { nome: { type: 'string' }, email: { type: 'string' }, senha: { type: 'string' } },
    },
  },
  required: ['error'],
}

// Sessão do painel (login e aceite do contrato): token de lava-rápido + empresa.
const loginLavaRapidoSchema = {
  type: 'object',
  properties: {
    token: { type: 'string', description: 'JWT HS256 (tipo lavaRapido) — enviar como `Authorization: Bearer <token>` nas rotas de gestão. Com `trocaDeSenhaObrigatoria`, é um token de escopo `trocar-senha` (15 min) que só serve para `POST /auth/lava-rapido/trocar-senha` (403 nas demais rotas).' },
    expiraEm: { type: 'string', format: 'date-time', description: 'Fim da validade do token (JWT_EXPIRES_IN, padrão 7 dias; 15 min no token de troca de senha).' },
    trocaDeSenhaObrigatoria: { type: 'boolean', description: 'true = entrou com a senha temporária enviada por e-mail (i17-senha-gerada): o painel precisa definir uma senha nova antes de qualquer outra coisa.' },
    lavaRapido: {
      allOf: [
        { $ref: '#/components/schemas/LavaRapidoComDisponibilidade' },
        { type: 'object', properties: { email: { type: 'string', format: 'email', nullable: true, description: 'E-mail de acesso (null em empresas anteriores ao I17).' } } },
      ],
    },
  },
}

const respostaLimiteTentativas = {
  429: {
    description: 'Limite de tentativas estourado (por IP + o e-mail ou o CNPJ da rota; padrão 10 a cada 15 min, LIMITE_TENTATIVAS / LIMITE_TENTATIVAS_JANELA_MINUTOS). Mensagem amigável em `error`; header Retry-After.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
  },
}

// Rotas de gestão do painel: autenticar('lavaRapido'); a empresa vem do token.
const segurancaPainel = [{ bearerAuth: [] }]
const erroAutenticacaoPainel = {
  401: { description: 'Sem token, ou token inválido/expirado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
  403: { description: 'Token válido, mas de outro tipo de usuário (ex.: cliente) ou de uso restrito (escopo `trocar-senha`).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
}

const erroAutenticacao = {
  401: { description: 'Sem token, token inválido/expirado ou cliente inexistente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
  403: { description: 'Token válido, mas de outro tipo de usuário (ex.: lava-rápido).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
}

// i17-interno-exclusao: usuário interno (equipe WashAway) e exclusão de empresa por solicitação.
const usuarioInternoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    nome: { type: 'string' },
    email: { type: 'string', format: 'email' },
    permissoes: { type: 'array', items: { type: 'string' }, example: ['admin'] },
    criadoEm: { type: 'string', format: 'date-time' },
  },
}

const loginInternoSchema = {
  type: 'object',
  properties: {
    token: { type: 'string', description: 'JWT HS256 (tipo interno, com `permissoes`) — clicar em "Authorize" no Swagger e colar o token.' },
    expiraEm: { type: 'string', format: 'date-time' },
    interno: { $ref: '#/components/schemas/UsuarioInterno' },
  },
}

const solicitacaoExclusaoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    lavaRapidoId: { type: 'string', nullable: true, description: 'null depois que a exclusão é aprovada (a empresa não existe mais).' },
    nome: { type: 'string', description: 'Snapshot do nome da empresa.' },
    cnpj: { type: 'string', description: 'Snapshot do CNPJ.' },
    email: { type: 'string', format: 'email', nullable: true, description: 'Snapshot do e-mail (null em empresas anteriores ao I17 — sem e-mail enfileirado).' },
    motivo: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['pendente', 'aprovada', 'recusada', 'cancelada'] },
    criadoEm: { type: 'string', format: 'date-time' },
    decididoEm: { type: 'string', format: 'date-time', nullable: true, description: 'Quando foi aprovada, recusada ou cancelada.' },
    decididoPorId: { type: 'string', nullable: true, description: 'Usuário interno que aprovou/recusou. Só nas rotas internas (não sai nas respostas da empresa).' },
    observacao: { type: 'string', nullable: true, description: 'Observação do interno ao recusar.' },
  },
}

// Rotas internas: autenticar('interno') (401) + autorizar('admin') (403).
const segurancaInterna = [{ bearerAuth: [] }]
const erroAutenticacaoInterna = {
  401: { description: 'Sem token, token inválido/expirado, ou interno que não existe mais.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
  403: { description: 'Token de outro tipo (lava-rápido, cliente) ou interno sem a permissão `admin` (no token ou, conferido a cada requisição, no banco).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
}

// I18: pedido como o cliente vê em /clientes/me/pedidos (sem fotos/dados do painel).
const pedidoClienteSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['pendente', 'aceito', 'recusado', 'em_andamento', 'concluido'] },
    horario: { type: 'string', format: 'date-time' },
    precoTotal: { type: 'number' },
    duracaoMinutos: { type: 'integer' },
    criadoEm: { type: 'string', format: 'date-time' },
    statusAlteradoEm: { type: 'string', format: 'date-time', nullable: true },
    motivoRecusa: { type: 'string', nullable: true },
    recusaVistaEm: { type: 'string', format: 'date-time', nullable: true, description: 'Quando o cliente viu a recusa (null = ainda não viu).' },
    quando: { type: 'string', enum: ['proximo', 'anterior'], description: '`proximo` se o horário não passou e o pedido não foi recusado nem concluído.' },
    lavaRapido: {
      type: 'object',
      properties: { id: { type: 'string' }, nome: { type: 'string' }, endereco: { type: 'string', nullable: true } },
    },
    veiculo: {
      type: 'object',
      properties: { id: { type: 'string' }, marca: { type: 'string', nullable: true }, modelo: { type: 'string' }, cor: { type: 'string' }, placa: { type: 'string' } },
    },
    servicos: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, servicoId: { type: 'string', nullable: true }, nome: { type: 'string' }, preco: { type: 'number' }, duracaoMinutos: { type: 'integer' } },
      },
    },
  },
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'WashAway — API',
    version: '1.0.0',
    description: 'Backend do WashAway (admin-front + app_mobile). Rotas do cliente logado usam `Authorization: Bearer <token>` (JWT, `POST /auth/cliente/login`); rotas de gestão do painel usam o token de lava-rápido (`POST /lavaRapidos/login`), e a empresa vem do token. Rotas internas (`/interno/*`) usam o token de usuário interno (`POST /auth/interno/login`) e exigem a permissão `admin` (401 = autenticação, 403 = permissão). Leituras do app, login, cadastro e onboarding são públicos — ver WashAway/.specs/backend.specs.md.',
  },
  servers: [{ url: 'http://localhost:4000' }],
  components: {
    schemas: {
      Erro: erroSchema,
      LavaRapido: lavaRapidoSchema,
      LavaRapidoComDisponibilidade: lavaRapidoDetalheSchema,
      HorarioDia: horarioDiaSchema,
      Pedido: pedidoSchema,
      NovoPedido: novoPedidoSchema,
      ErroPedido: erroPedidoSchema,
      ErroStatusPedido: erroStatusPedidoSchema,
      PedidoCliente: pedidoClienteSchema,
      Servico: servicoSchema,
      ItemServico: itemServicoSchema,
      Intercorrencia: intercorrenciaSchema,
      Veiculo: veiculoSchema,
      Contrato: contratoSchema,
      SolicitacaoOnboarding: solicitacaoOnboardingSchema,
      Cliente: clienteSchema,
      LoginCliente: loginClienteSchema,
      ErroCadastroCliente: erroCadastroClienteSchema,
      LoginLavaRapido: loginLavaRapidoSchema,
      VeiculoCliente: veiculoClienteSchema,
      ErroVeiculoCliente: erroVeiculoClienteSchema,
      UsuarioInterno: usuarioInternoSchema,
      LoginInterno: loginInternoSchema,
      SolicitacaoExclusao: solicitacaoExclusaoSchema,
    },
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/auth/cliente/cadastro': {
      post: {
        tags: ['clientes'],
        summary: 'Cadastro de cliente do app (público)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'email', 'senha'],
                properties: {
                  nome: { type: 'string', maxLength: 100 },
                  email: { type: 'string', format: 'email', maxLength: 254, description: 'Único sem diferenciar maiúsculas.' },
                  senha: { type: 'string', minLength: 6, maxLength: 72, description: 'No máximo 72 bytes em UTF-8 (limite do bcrypt).' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Criado (sem a senha).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cliente' } } } },
          400: { description: 'Nome vazio ou longo demais, e-mail ausente/inválido ou senha fora de 6 a 72 caracteres.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroCadastroCliente' } } } },
          409: { description: 'Este e-mail já está cadastrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...respostaLimiteTentativas,
        },
      },
    },
    '/auth/cliente/login': {
      post: {
        tags: ['clientes'],
        summary: 'Login do cliente por e-mail + senha (público)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'senha'],
                properties: { email: { type: 'string', format: 'email' }, senha: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Credenciais válidas: token de acesso + cliente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginCliente' } } } },
          401: { description: '"E-mail ou senha incorretos" — mesma resposta para e-mail inexistente, senha errada ou body incompleto.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...respostaLimiteTentativas,
        },
      },
    },
    '/clientes/me': {
      get: {
        tags: ['clientes'],
        summary: 'Dados do cliente logado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cliente do token (sem a senha).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cliente' } } } },
          ...erroAutenticacao,
        },
      },
    },
    '/clientes/me/veiculos': {
      get: {
        tags: ['clientes'],
        summary: 'Veículos do cliente logado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Veículos do cliente do token (mais antigo primeiro).', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/VeiculoCliente' } } } } },
          ...erroAutenticacao,
        },
      },
      post: {
        tags: ['clientes'],
        summary: 'Cadastra um veículo do cliente logado',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: dadosVeiculoClienteSchema } } },
        responses: {
          201: { description: 'Criado (placa normalizada).', content: { 'application/json': { schema: { $ref: '#/components/schemas/VeiculoCliente' } } } },
          400: { description: 'Modelo/cor/placa faltando, texto longo demais ou placa em formato inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroVeiculoCliente' } } } },
          409: { description: 'O cliente já cadastrou um veículo com essa placa.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacao,
        },
      },
    },
    '/clientes/me/veiculos/{id}': {
      put: {
        tags: ['clientes'],
        summary: 'Edita um veículo do cliente logado',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: dadosVeiculoClienteSchema } } },
        responses: {
          200: { description: 'Atualizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/VeiculoCliente' } } } },
          400: { description: 'Dados inválidos (mesmas regras do cadastro).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroVeiculoCliente' } } } },
          404: { description: 'Veículo inexistente ou de outro cliente (nunca 403).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Outro veículo do cliente já tem essa placa.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacao,
        },
      },
      delete: {
        tags: ['clientes'],
        summary: 'Remove um veículo do cliente logado',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Removido.' },
          404: { description: 'Veículo inexistente ou de outro cliente (nunca 403).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Veículo com pedidos não pode ser removido (I13).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacao,
        },
      },
    },
    '/clientes/me/pedidos': {
      get: {
        tags: ['clientes'],
        summary: 'Pedidos do cliente logado (I18)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Só os pedidos do cliente do token, do horário mais cedo para o mais tarde.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PedidoCliente' } } } } },
          ...erroAutenticacao,
        },
      },
    },
    '/clientes/me/pedidos/{id}': {
      get: {
        tags: ['clientes'],
        summary: 'Detalhe de um pedido do cliente logado (I18)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Pedido do cliente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/PedidoCliente' } } } },
          404: { description: 'Pedido inexistente ou de outro cliente (nunca 403).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacao,
        },
      },
    },
    '/clientes/me/pedidos/{id}/visto': {
      post: {
        tags: ['clientes'],
        summary: 'Marca a recusa do pedido como vista (I18)',
        description: 'Preenche `recusaVistaEm` se o pedido estiver recusado e ainda não visto; nos outros casos não muda nada (idempotente).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Marcado (ou já estava).' },
          404: { description: 'Pedido inexistente ou de outro cliente (nunca 403).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacao,
        },
      },
    },
    '/clientes/me/notificacoes': {
      get: {
        tags: ['clientes'],
        summary: 'Contadores do app: recusas ainda não vistas (I18)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Quantidade de pedidos do cliente recusados e ainda não vistos.',
            content: { 'application/json': { schema: { type: 'object', properties: { recusasNaoVistas: { type: 'integer' } } } } },
          },
          ...erroAutenticacao,
        },
      },
    },
    '/lavaRapidos': {
      get: {
        tags: ['lavaRapidos'],
        summary: 'Lista os lava-rápidos (todos, ou só os abertos num horário)',
        parameters: [
          {
            name: 'horario',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time', example: '2026-10-20T10:00:00-03:00' },
            description: 'Busca por horário (I9): ISO 8601 com fuso, de agora (tolerância de 1 min) até 30 dias à frente. Com ele, só vêm os lava-rápidos abertos naquele instante (horário de funcionamento, sem intercorrência de dia inteiro nem parcial cobrindo o instante, e coluna isOpen ligada). O isOpen da resposta continua sendo "aberto agora".',
          },
        ],
        responses: {
          200: {
            description: 'Lista de lava-rápidos (isOpen calculado pelo horário de funcionamento e pelas intercorrências; sem intercorrenciaAtiva).',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/LavaRapido' } } } },
          },
          400: { description: 'horario inválido (sem fuso ou malformado), no passado ou além de 30 dias à frente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/lavaRapidos/login': {
      post: {
        tags: ['lavaRapidos'],
        summary: 'Login do painel por CNPJ + senha (público) — devolve o token de lava-rápido',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['cnpj', 'senha'],
                properties: { cnpj: { type: 'string' }, senha: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Credenciais válidas: `{ token, expiraEm, trocaDeSenhaObrigatoria, lavaRapido }`. Senha própria → token normal (e a senha temporária, se havia, é descartada); senha temporária → `trocaDeSenhaObrigatoria: true` + token de escopo `trocar-senha`.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginLavaRapido' } } } },
          401: { description: 'cnpj ou senha inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...respostaLimiteTentativas,
        },
      },
    },
    '/auth/lava-rapido/trocar-senha': {
      post: {
        tags: ['lavaRapidos'],
        summary: 'Define a senha nova do painel (troca obrigatória ou troca voluntária)',
        description: 'Aceita o token de escopo `trocar-senha` (login com a senha temporária; basta `novaSenha`) ou o token normal (exige `senhaAtual`). Grava a senha nova, descarta a senha temporária e devolve uma sessão normal.',
        security: segurancaPainel,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['novaSenha'],
                properties: {
                  novaSenha: { type: 'string', minLength: 8, description: '8 a 72 bytes; diferente da senha temporária.' },
                  senhaAtual: { type: 'string', description: 'Obrigatória só com o token normal.' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Senha trocada: sessão normal `{ token, expiraEm, trocaDeSenhaObrigatoria: false, lavaRapido }`.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginLavaRapido' } } } },
          400: { description: 'Nova senha fora de 8 a 72 bytes ou igual à senha temporária.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Sem token, token inválido/expirado, empresa inexistente ou token de troca que já foi usado (não há mais senha temporária).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          403: { description: 'Senha atual incorreta (token normal), token de outro tipo ou de outro escopo.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          429: { description: 'Limite de tentativas (falhas) por IP.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/auth/lava-rapido/esqueci-senha': {
      post: {
        tags: ['lavaRapidos'],
        summary: '"Esqueci minha senha" do painel (público)',
        description: 'Se houver empresa com o e-mail, gera uma senha temporária nova (substitui a anterior; a senha própria continua valendo) e enfileira o e-mail `esqueci_senha`. A resposta é sempre a mesma, exista ou não o e-mail.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } },
        },
        responses: {
          200: {
            description: 'Sempre `{ mensagem: "Se o e-mail estiver cadastrado, enviaremos uma senha temporária" }`.',
            content: { 'application/json': { schema: { type: 'object', properties: { mensagem: { type: 'string' } } } } },
          },
          400: { description: 'E-mail ausente ou com formato inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          429: { description: 'Limite por IP + e-mail (toda tentativa conta; padrão 5 por hora, LIMITE_ESQUECI_SENHA / LIMITE_ESQUECI_SENHA_JANELA_MINUTOS).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/lavaRapidos/me/solicitacao-exclusao': {
      post: {
        tags: ['exclusao'],
        summary: 'A empresa do token solicita a exclusão (painel)',
        description: 'Só uma pendente por empresa: se já houver, devolve a existente (200). Enfileira o e-mail `exclusao_solicitada`. Quem exclui é um interno `admin`, ao aprovar.',
        security: segurancaPainel,
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { type: 'object', properties: { motivo: { type: 'string', maxLength: 500, nullable: true } } } } },
        },
        responses: {
          201: { description: 'Solicitação criada (pendente).', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoExclusao' } } } },
          200: { description: 'Já havia uma pendente: devolve a mesma.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoExclusao' } } } },
          400: { description: 'motivo não é texto ou passa de 500 caracteres.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Sem token, token inválido/expirado ou empresa que não existe mais.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          403: { description: 'Token de outro tipo (cliente, interno).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      get: {
        tags: ['exclusao'],
        summary: 'Solicitação de exclusão mais recente da empresa do token (qualquer status)',
        security: segurancaPainel,
        responses: {
          200: { description: 'Encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoExclusao' } } } },
          404: { description: 'A empresa nunca solicitou.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoPainel,
        },
      },
      delete: {
        tags: ['exclusao'],
        summary: 'Cancela a solicitação pendente da empresa do token',
        security: segurancaPainel,
        responses: {
          200: { description: 'Cancelada (status cancelada).', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoExclusao' } } } },
          404: { description: 'Não há solicitação pendente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoPainel,
        },
      },
    },
    '/auth/interno/login': {
      post: {
        tags: ['interno'],
        summary: 'Login da equipe WashAway (usuário interno)',
        description: 'Internos só são criados por script/seed/demo (`npm run interno:criar`). Em dev, o `npm run prisma:demo` cria `dev@washaway.dev` / `demo1234` (admin).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'senha'], properties: { email: { type: 'string', format: 'email' }, senha: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { description: 'Credenciais válidas: token tipo interno com as permissões.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInterno' } } } },
          401: { description: '"E-mail ou senha incorretos" — mesma resposta para e-mail inexistente, senha errada ou body incompleto.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...respostaLimiteTentativas,
        },
      },
    },
    '/interno/solicitacoes-exclusao': {
      get: {
        tags: ['interno'],
        summary: 'Lista as solicitações de exclusão (mais antigas primeiro) — admin',
        security: segurancaInterna,
        parameters: [{ name: 'status', in: 'query', required: false, schema: { type: 'string', enum: ['pendente', 'aprovada', 'recusada', 'cancelada'] } }],
        responses: {
          200: { description: 'Lista.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/SolicitacaoExclusao' } } } } },
          400: { description: 'status inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoInterna,
        },
      },
    },
    '/interno/solicitacoes-exclusao/{id}/aprovar': {
      post: {
        tags: ['interno'],
        summary: 'Aprova a solicitação e EXCLUI a empresa — admin',
        description: 'Numa transação: marca `aprovada`, enfileira o e-mail `exclusao_aprovada` e exclui o lava-rápido (pedidos, serviços, intercorrências e horários vão junto). O registro da solicitação continua, com o snapshot.',
        security: segurancaInterna,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Aprovada (lavaRapidoId agora null).', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoExclusao' } } } },
          404: { description: 'Solicitação não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Solicitação não está mais pendente (já aprovada, recusada ou cancelada).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoInterna,
        },
      },
    },
    '/interno/solicitacoes-exclusao/{id}/recusar': {
      post: {
        tags: ['interno'],
        summary: 'Recusa a solicitação (a empresa continua) — admin',
        description: 'Grava a observação e enfileira o e-mail `exclusao_recusada`.',
        security: segurancaInterna,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { type: 'object', properties: { observacao: { type: 'string', maxLength: 500, nullable: true } } } } },
        },
        responses: {
          200: { description: 'Recusada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoExclusao' } } } },
          400: { description: 'observacao não é texto ou passa de 500 caracteres.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Solicitação não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Solicitação não está mais pendente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoInterna,
        },
      },
    },
    '/lavaRapidos/{id}': {
      get: {
        tags: ['lavaRapidos'],
        summary: 'Busca um lava-rápido por id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Encontrado (isOpen calculado; inclui intercorrenciaAtiva, foraDoHorario e horarios).',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LavaRapidoComDisponibilidade' } } },
          },
          404: { description: 'Não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/lavaRapidos/{id}/horarios': {
      get: {
        tags: ['lavaRapidos'],
        summary: 'Horário de funcionamento semanal (público)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Os 7 dias, na ordem 0 (domingo) a 6 (sábado); dia não cadastrado vem com definido: false.',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/HorarioDia' } } } },
          },
          404: { description: 'Lava-rápido não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      put: {
        tags: ['lavaRapidos'],
        summary: 'Substitui o horário semanal da empresa do token (painel)',
        description: 'Exige token de lava-rápido; `:id` tem de ser a empresa do token (outra empresa = 404, nada é alterado). Body com exatamente os 7 dias; substitui tudo numa transação.',
        security: segurancaPainel,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['dias'],
                properties: {
                  dias: {
                    type: 'array',
                    minItems: 7,
                    maxItems: 7,
                    items: {
                      type: 'object',
                      required: ['diaSemana', 'fechado'],
                      properties: {
                        diaSemana: { type: 'integer', minimum: 0, maximum: 6, description: '0 = domingo … 6 = sábado; cada dia uma vez.' },
                        fechado: { type: 'boolean' },
                        abertura: { type: 'string', nullable: true, example: '08:00', description: '"HH:mm" (00:00–23:59); obrigatório num dia aberto, proibido num dia fechado.' },
                        fechamento: { type: 'string', nullable: true, example: '18:00', description: '"HH:mm", depois da abertura; obrigatório num dia aberto, proibido num dia fechado.' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Horário salvo: os 7 dias, na ordem 0 a 6.',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/HorarioDia' } } } },
          },
          400: { description: 'Horário inválido (dia faltando/repetido, formato, abertura ≥ fechamento, horas num dia fechado ou faltando num dia aberto); mensagem em `error`.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          401: { description: 'Sem token, token inválido/expirado ou empresa do token inexistente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          403: { description: 'Token válido, mas de outro tipo de usuário (ex.: cliente).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: '`:id` não é a empresa do token (outra empresa ou inexistente); nada é alterado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/pedidos': {
      post: {
        tags: ['pedidos'],
        summary: 'Cria um pedido do cliente logado (app, I13)',
        description:
          'Exige token de cliente; o cliente vem do token. Preço total e duração são calculados no servidor a partir dos serviços (ativos e do lava-rápido informado), e cada serviço é congelado no pedido. Nasce `pendente`.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NovoPedido' } } } },
        responses: {
          201: { description: 'Pedido criado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pedido' } } } },
          400: {
            description:
              'DADOS_INVALIDOS (campos/lista de serviços/horário mal formados), HORARIO_PASSADO, SERVICO_INVALIDO (inexistente, inativo ou de outro lava-rápido) ou HORARIO_INDISPONIVEL (I20: o período de `horario` até `horario` + duração dos serviços não cabe no horário de funcionamento do dia ou cai num fechamento não reaberto; `error` traz a mensagem do caso em hora de São Paulo, ex.: "Nesse dia o lava-rápido fecha às 18:00. O atendimento escolhido termina às 18:30.").',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroPedido' } } },
          },
          401: { description: 'Sem token, ou token inválido/expirado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          403: { description: 'Token de outro tipo de usuário (ex.: lava-rápido).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: {
            description: 'LAVA_RAPIDO_NAO_ENCONTRADO ou VEICULO_NAO_ENCONTRADO (inexistente ou de outro cliente).',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroPedido' } } },
          },
        },
      },
      get: {
        tags: ['pedidos'],
        summary: 'Lista os pedidos da empresa do token, mais recentes primeiro (painel)',
        description: 'A empresa vem do token; `?lavaRapidoId=` é ignorado.',
        security: segurancaPainel,
        responses: {
          200: { description: 'Lista de pedidos.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Pedido' } } } } },
          ...erroAutenticacaoPainel,
        },
      },
    },
    '/pedidos/{id}': {
      patch: {
        tags: ['pedidos'],
        summary: 'Muda o status do pedido: aceitar, recusar, iniciar, concluir (painel)',
        description:
          'Só as transições permitidas (I15): pendente → aceito | recusado; aceito → em_andamento; em_andamento → concluido. ' +
          'Grava `statusAlteradoEm`; `motivo` (opcional, até 200 caracteres) só ao recusar. Outros campos do body são ignorados.',
        security: segurancaPainel,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['pendente', 'aceito', 'recusado', 'em_andamento', 'concluido'] },
                  motivo: { type: 'string', maxLength: 200, description: 'Só com status recusado.' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Atualizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pedido' } } } },
          400: { description: 'status inexistente ou motivo inválido (DADOS_INVALIDOS).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroStatusPedido' } } } },
          404: { description: 'Pedido não encontrado ou de outra empresa (PEDIDO_NAO_ENCONTRADO).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroStatusPedido' } } } },
          409: { description: 'Transição não permitida a partir do status atual (TRANSICAO_INVALIDA).', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErroStatusPedido' } } } },
          ...erroAutenticacaoPainel,
        },
      },
    },
    '/servicos': {
      get: {
        tags: ['servicos'],
        summary: 'Lista serviços (público — app do cliente e painel)',
        parameters: [lavaRapidoIdParam],
        responses: {
          200: { description: 'Lista de serviços (combos) com seus itens.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Servico' } } } } },
        },
      },
      post: {
        tags: ['servicos'],
        summary: 'Cria um serviço (combo de itens do catálogo) na empresa do token (painel)',
        description: '`lavaRapidoId` no body é ignorado: a empresa vem do token.',
        security: segurancaPainel,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'preco', 'itemIds'],
                properties: dadosServicoProperties,
              },
            },
          },
        },
        responses: {
          201: { description: 'Criado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Servico' } } } },
          400: { description: 'Body inválido ou itens inexistentes/inativos no catálogo (`itemIdsInvalidos`).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoPainel,
        },
      },
    },
    '/servicos/{id}': {
      put: {
        tags: ['servicos'],
        summary: 'Edita nome, preço e itens de um serviço (substitui os itens) (painel)',
        security: segurancaPainel,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['nome', 'preco', 'itemIds'], properties: dadosServicoProperties },
            },
          },
        },
        responses: {
          200: { description: 'Atualizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Servico' } } } },
          400: { description: 'Body inválido ou itens inexistentes/inativos no catálogo (`itemIdsInvalidos`).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Serviço não encontrado ou de outra empresa.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoPainel,
        },
      },
      patch: {
        tags: ['servicos'],
        summary: 'Atualiza só o campo ativo (painel)',
        security: segurancaPainel,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['ativo'], properties: { ativo: { type: 'boolean' } } },
            },
          },
        },
        responses: {
          200: { description: 'Atualizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Servico' } } } },
          400: { description: 'body deve conter só { ativo: boolean }.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Serviço não encontrado ou de outra empresa.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoPainel,
        },
      },
    },
    '/itensServico': {
      get: {
        tags: ['itensServico'],
        summary: 'Lista o catálogo global de itens ativos (só leitura)',
        responses: {
          200: { description: 'Itens ativos, ordenados por categoria e nome.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ItemServico' } } } } },
        },
      },
    },
    '/intercorrencias': {
      get: {
        tags: ['intercorrencias'],
        summary: 'Lista intercorrências (público — app do cliente e painel)',
        parameters: [lavaRapidoIdParam],
        responses: {
          200: { description: 'Lista de intercorrências.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Intercorrencia' } } } } },
        },
      },
      post: {
        tags: ['intercorrencias'],
        summary: 'Cria uma intercorrência na empresa do token (painel)',
        description: '`lavaRapidoId` no body é ignorado: a empresa vem do token.',
        security: segurancaPainel,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'motivo', 'diaInteiro'],
                properties: {
                  data: { type: 'string', example: '2026-10-12' },
                  motivo: { type: 'string' },
                  diaInteiro: { type: 'boolean' },
                  horaInicio: { type: 'string', example: '14:00', description: 'Só quando diaInteiro é false.' },
                  horaFim: { type: 'string', example: '16:00', description: 'Só quando diaInteiro é false.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Criada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Intercorrencia' } } } },
          400: {
            description: 'body inválido, ou horaInicio/horaFim inconsistentes com diaInteiro.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
          },
          ...erroAutenticacaoPainel,
        },
      },
    },
    '/intercorrencias/{id}': {
      patch: {
        tags: ['intercorrencias'],
        summary: 'Reabre manualmente (reverte o fechamento automático do isOpen) (painel)',
        security: segurancaPainel,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['reaberta'], properties: { reaberta: { type: 'boolean', enum: [true] } } },
            },
          },
        },
        responses: {
          200: { description: 'Reaberta.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Intercorrencia' } } } },
          400: { description: 'body inválido — só aceita { reaberta: true }.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Intercorrência não encontrada ou de outra empresa.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...erroAutenticacaoPainel,
        },
      },
    },
    '/veiculos': {
      get: {
        tags: ['veiculos'],
        summary: 'Lista veículos distintos, derivados dos pedidos da empresa do token (painel)',
        security: segurancaPainel,
        responses: {
          200: { description: 'Veículos distintos dos pedidos da empresa (relação Pedido → Veiculo).', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Veiculo' } } } } },
          ...erroAutenticacaoPainel,
        },
      },
    },
    '/contratos/vigente': {
      get: {
        tags: ['onboarding'],
        summary: 'Contrato vigente do onboarding',
        responses: {
          200: { description: 'Contrato vigente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Contrato' } } } },
          404: { description: 'Nenhum contrato vigente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/onboarding/solicitacoes': {
      post: {
        tags: ['onboarding'],
        summary: 'Solicita o cadastro de uma empresa, com e-mail e senha própria (validação: duplicidade de cnpj/e-mail; aprovação automática)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'cnpj', 'email', 'senha'],
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  cnpj: { type: 'string', example: '00000000000101', description: '14 dígitos numéricos.' },
                  email: { type: 'string', format: 'email', maxLength: 254, description: 'Único entre os lava-rápidos (sem diferenciar maiúsculas).' },
                  senha: { type: 'string', minLength: 8, maxLength: 72, description: 'Senha de acesso ao painel; guardada só com hash bcrypt (no máximo 72 bytes em UTF-8).' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Criada já como aguardando_contrato, com o contrato vigente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoOnboarding' } } } },
          200: { description: 'Já havia solicitação pendente com esse cnpj — devolvida para retomar (com nome/endereço deste envio) quando o e-mail e a senha conferem com os dela. Solicitação anterior ao I17 (sem senha) é completada com o e-mail e a senha deste envio.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoOnboarding' } } } },
          400: { description: 'name ausente, cnpj com formato inválido, e-mail ausente/inválido ou senha com menos de 8 caracteres.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'cnpj ou e-mail já cadastrado como lava-rápido, ou solicitação em andamento para o cnpj com outro e-mail/senha (as credenciais dela não são trocadas).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          503: { description: 'Nenhum contrato vigente cadastrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...respostaLimiteTentativas,
        },
      },
    },
    '/onboarding/solicitacoes/{id}': {
      get: {
        tags: ['onboarding'],
        summary: 'Status + contrato de uma solicitação',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoOnboarding' } } } },
          404: { description: 'Não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/onboarding/solicitacoes/{id}/aceite': {
      post: {
        tags: ['onboarding'],
        summary: 'Assina o contrato (mock "eu aceito") e cria o lava-rápido',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['aceite'], properties: { aceite: { type: 'string', example: 'eu aceito' } } },
            },
          },
        },
        responses: {
          201: { description: 'Contrato aceito; lava-rápido criado com o e-mail e a senha da solicitação. Devolve a sessão do painel `{ token, expiraEm, lavaRapido }`.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginLavaRapido' } } } },
          400: { description: 'aceite diferente de "eu aceito".', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Solicitação não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Solicitação já concluída, solicitação antiga sem e-mail/senha (reenviar o cadastro), ou cnpj/e-mail cadastrado por outro caminho.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
  },
}
