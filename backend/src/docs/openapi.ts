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
  properties: {
    id: { type: 'string' },
    lavaRapidoId: { type: 'string' },
    veiculo: { type: 'object' },
    servico: { type: 'string' },
    horario: { type: 'string', format: 'date-time' },
    status: { type: 'string', enum: ['pendente', 'em_andamento', 'concluido'] },
    fotos: { type: 'array', items: { type: 'string' } },
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
  properties: {
    id: { type: 'string', description: 'A placa do veículo.' },
    modelo: { type: 'string' },
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
    token: { type: 'string', description: 'JWT HS256 (tipo lavaRapido) — enviar como `Authorization: Bearer <token>` nas rotas de gestão.' },
    expiraEm: { type: 'string', format: 'date-time', description: 'Fim da validade do token (JWT_EXPIRES_IN, padrão 7 dias).' },
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
    description: 'Limite de tentativas estourado (por IP + e-mail/CNPJ; padrão 10 a cada 15 min, LIMITE_TENTATIVAS / LIMITE_TENTATIVAS_JANELA_MINUTOS). Mensagem amigável em `error`; header Retry-After.',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
  },
}

// Rotas de gestão do painel: autenticar('lavaRapido'); a empresa vem do token.
const segurancaPainel = [{ bearerAuth: [] }]
const erroAutenticacaoPainel = {
  401: { description: 'Sem token, ou token inválido/expirado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
  403: { description: 'Token válido, mas de outro tipo de usuário (ex.: cliente).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
}

const erroAutenticacao = {
  401: { description: 'Sem token, token inválido/expirado ou cliente inexistente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
  403: { description: 'Token válido, mas de outro tipo de usuário (ex.: lava-rápido).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'WashAway — API',
    version: '1.0.0',
    description: 'Backend do WashAway (admin-front + app_mobile). Rotas do cliente logado usam `Authorization: Bearer <token>` (JWT, `POST /auth/cliente/login`); rotas de gestão do painel usam o token de lava-rápido (`POST /lavaRapidos/login`), e a empresa vem do token. Leituras do app, login, cadastro e onboarding são públicos — ver WashAway/.specs/backend.specs.md.',
  },
  servers: [{ url: 'http://localhost:4000' }],
  components: {
    schemas: {
      Erro: erroSchema,
      LavaRapido: lavaRapidoSchema,
      LavaRapidoComDisponibilidade: lavaRapidoDetalheSchema,
      HorarioDia: horarioDiaSchema,
      Pedido: pedidoSchema,
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
          ...erroAutenticacao,
        },
      },
    },
    '/lavaRapidos': {
      get: {
        tags: ['lavaRapidos'],
        summary: 'Lista todos os lava-rápidos',
        responses: {
          200: {
            description: 'Lista de lava-rápidos (isOpen calculado pelo horário de funcionamento e pelas intercorrências; sem intercorrenciaAtiva).',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/LavaRapido' } } } },
          },
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
          200: { description: 'Credenciais válidas: `{ token, expiraEm, lavaRapido }`.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginLavaRapido' } } } },
          401: { description: 'cnpj ou senha inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          ...respostaLimiteTentativas,
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
    },
    '/pedidos': {
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
        summary: 'Atualiza só o status do pedido (painel)',
        security: segurancaPainel,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['pendente', 'em_andamento', 'concluido'] } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Atualizado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pedido' } } } },
          400: { description: 'status inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Pedido não encontrado ou de outra empresa.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
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
          200: { description: 'Lista de veículos (deduplicados por placa).', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Veiculo' } } } } },
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
          200: { description: 'Já havia solicitação pendente com esse cnpj — devolvida para retomar, atualizada com os dados (inclusive e-mail e senha) deste envio.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoOnboarding' } } } },
          400: { description: 'name ausente, cnpj com formato inválido, e-mail ausente/inválido ou senha com menos de 8 caracteres.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'cnpj ou e-mail já cadastrado como lava-rápido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          503: { description: 'Nenhum contrato vigente cadastrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
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
