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
    price: { type: 'number' },
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
    categoria: { type: 'string' },
    preco: { type: 'number' },
    ativo: { type: 'boolean' },
  },
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
      Intercorrencia: intercorrenciaSchema,
      Veiculo: veiculoSchema,
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
        summary: 'Cadastra um lava-rápido (senha fixada como hash de "admin")',
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
          200: { description: 'Lista de serviços.', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Servico' } } } } },
        },
      },
    },
    '/servicos/{id}': {
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
  },
}
