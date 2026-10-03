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

const lavaRapidoIdParam = {
  name: 'lavaRapidoId',
  in: 'query',
  required: false,
  schema: { type: 'string' },
  description: 'Filtra pela empresa dona do recurso.',
}

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'WashAway — API',
    version: '1.0.0',
    description: 'Backend do WashAway (admin-front + app_mobile). Sem autenticação/middleware nas rotas — ver WashAway/.specs/backend.specs.md seção 7.',
  },
  servers: [{ url: 'http://localhost:4000' }],
  components: {
    schemas: {
      Erro: erroSchema,
      LavaRapido: lavaRapidoSchema,
      LavaRapidoComDisponibilidade: lavaRapidoDetalheSchema,
      Pedido: pedidoSchema,
      Servico: servicoSchema,
      ItemServico: itemServicoSchema,
      Intercorrencia: intercorrenciaSchema,
      Veiculo: veiculoSchema,
      Contrato: contratoSchema,
      SolicitacaoOnboarding: solicitacaoOnboardingSchema,
    },
  },
  paths: {
    '/lavaRapidos': {
      get: {
        tags: ['lavaRapidos'],
        summary: 'Lista todos os lava-rápidos',
        responses: {
          200: {
            description: 'Lista de lava-rápidos (isOpen calculado, sem intercorrenciaAtiva).',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/LavaRapido' } } } },
          },
        },
      },
      post: {
        tags: ['lavaRapidos'],
        summary: 'Cadastra um lava-rápido direto — legado/interno (seed, testes); o admin-front usa o fluxo /onboarding',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'cnpj'],
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  cnpj: { type: 'string', example: '00000000000101', description: '14 dígitos numéricos.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Criado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LavaRapido' } } } },
          400: { description: 'name ausente ou cnpj com formato inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'cnpj já cadastrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/lavaRapidos/login': {
      post: {
        tags: ['lavaRapidos'],
        summary: 'Login por CNPJ + senha',
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
          200: { description: 'Credenciais válidas.', content: { 'application/json': { schema: { $ref: '#/components/schemas/LavaRapido' } } } },
          401: { description: 'cnpj ou senha inválidos.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
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
            description: 'Encontrado (inclui intercorrenciaAtiva).',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LavaRapidoComDisponibilidade' } } },
          },
          404: { description: 'Não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      delete: {
        tags: ['lavaRapidos'],
        summary: 'Exclui um lava-rápido (em cascata: apaga junto seus pedidos, serviços e intercorrências)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Excluído.' },
          404: { description: 'Não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/pedidos': {
      get: {
        tags: ['pedidos'],
        summary: 'Lista pedidos, mais recentes primeiro',
        parameters: [lavaRapidoIdParam],
        responses: {
          200: { description: 'Lista de pedidos.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Pedido' } } } } },
        },
      },
    },
    '/pedidos/{id}': {
      patch: {
        tags: ['pedidos'],
        summary: 'Atualiza só o status do pedido',
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
          404: { description: 'Pedido não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/servicos': {
      get: {
        tags: ['servicos'],
        summary: 'Lista serviços',
        parameters: [lavaRapidoIdParam],
        responses: {
          200: { description: 'Lista de serviços (combos) com seus itens.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Servico' } } } } },
        },
      },
      post: {
        tags: ['servicos'],
        summary: 'Cria um serviço (combo de itens do catálogo) para um lava-rápido',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lavaRapidoId', 'nome', 'preco', 'itemIds'],
                properties: { lavaRapidoId: { type: 'string' }, ...dadosServicoProperties },
              },
            },
          },
        },
        responses: {
          201: { description: 'Criado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Servico' } } } },
          400: { description: 'Body inválido ou itens inexistentes/inativos no catálogo (`itemIdsInvalidos`).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Lava-rápido não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/servicos/{id}': {
      put: {
        tags: ['servicos'],
        summary: 'Edita nome, preço e itens de um serviço (substitui os itens)',
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
          404: { description: 'Serviço não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
      patch: {
        tags: ['servicos'],
        summary: 'Atualiza só o campo ativo',
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
          404: { description: 'Serviço não encontrado.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
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
        summary: 'Lista intercorrências',
        parameters: [lavaRapidoIdParam],
        responses: {
          200: { description: 'Lista de intercorrências.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Intercorrencia' } } } } },
        },
      },
      post: {
        tags: ['intercorrencias'],
        summary: 'Cria uma intercorrência',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lavaRapidoId', 'data', 'motivo', 'diaInteiro'],
                properties: {
                  lavaRapidoId: { type: 'string' },
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
            description: 'body inválido, ou horaInicio/horaFim inconsistentes com diaInteiro, ou lavaRapidoId inexistente.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
          },
        },
      },
    },
    '/intercorrencias/{id}': {
      patch: {
        tags: ['intercorrencias'],
        summary: 'Reabre manualmente (reverte o fechamento automático do isOpen)',
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
          404: { description: 'Intercorrência não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
    '/veiculos': {
      get: {
        tags: ['veiculos'],
        summary: 'Lista veículos distintos, derivados de Pedido.veiculo',
        parameters: [lavaRapidoIdParam],
        responses: {
          200: { description: 'Lista de veículos (deduplicados por placa).', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Veiculo' } } } } },
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
        summary: 'Solicita o cadastro de uma empresa (validação: só duplicidade de cnpj; aprovação automática)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'cnpj'],
                properties: {
                  name: { type: 'string' },
                  address: { type: 'string' },
                  cnpj: { type: 'string', example: '00000000000101', description: '14 dígitos numéricos.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Criada já como aguardando_contrato, com o contrato vigente.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoOnboarding' } } } },
          200: { description: 'Já havia solicitação pendente com esse cnpj — devolvida para retomar.', content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitacaoOnboarding' } } } },
          400: { description: 'name ausente ou cnpj com formato inválido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'cnpj já cadastrado como lava-rápido.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
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
          201: { description: 'Contrato aceito; lava-rápido criado (senha padrão "admin").', content: { 'application/json': { schema: { $ref: '#/components/schemas/LavaRapido' } } } },
          400: { description: 'aceite diferente de "eu aceito".', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          404: { description: 'Solicitação não encontrada.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
          409: { description: 'Solicitação já concluída, ou cnpj cadastrado por outro caminho.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } } },
        },
      },
    },
  },
}
