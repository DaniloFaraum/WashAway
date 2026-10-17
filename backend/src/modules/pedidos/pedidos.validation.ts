import { PedidoStatus } from '@prisma/client'

export function isValidStatus(status: unknown): status is PedidoStatus {
  return typeof status === 'string' && (Object.values(PedidoStatus) as string[]).includes(status)
}

// ---------------------------------------------------------------------------
// Criação de pedido (I13, `POST /pedidos`)
// ---------------------------------------------------------------------------

/**
 * Códigos estáveis das recusas do `POST /pedidos` (corpo `{ error, codigo }`).
 * O I20 acrescenta 'HORARIO_INDISPONIVEL'.
 */
export type CodigoErroPedido =
  | 'DADOS_INVALIDOS'
  | 'HORARIO_PASSADO'
  | 'SERVICO_INVALIDO'
  | 'LAVA_RAPIDO_NAO_ENCONTRADO'
  | 'VEICULO_NAO_ENCONTRADO'

export interface ErroPedido {
  status: 400 | 404
  error: string
  codigo: CodigoErroPedido
  /** Só em SERVICO_INVALIDO: os ids recusados. */
  servicoIdsInvalidos?: string[]
}

export interface DadosCriacaoPedido {
  lavaRapidoId: string
  veiculoId: string
  servicoIds: string[]
  horario: Date
}

/** Limite defensivo de serviços por pedido. */
export const MAX_SERVICOS_POR_PEDIDO = 20

// ISO 8601 com data, hora e fuso explícito (Z ou ±HH:mm): sem fuso, o mesmo
// texto seria lido em horas diferentes conforme o fuso do servidor.
const ISO_COM_FUSO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(:(\d{2})(\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/

/**
 * `true` se `texto` é ISO 8601 com fuso e uma data/hora que existe — o
 * `Date.parse` aceita "31/02" (vira 03/03), então os campos são conferidos.
 */
export function isIsoComFusoValido(texto: string): boolean {
  const partes = ISO_COM_FUSO.exec(texto)
  if (!partes) return false
  const [ano, mes, dia, hora, minuto] = partes.slice(1, 6).map(Number)
  const segundo = partes[7] ? Number(partes[7]) : 0
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const fusoOk = partes[9] === 'Z' || (Number(partes[10]) <= 14 && Number(partes[11]) <= 59)
  return (
    mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes &&
    hora <= 23 && minuto <= 59 && segundo <= 59 && fusoOk &&
    !Number.isNaN(Date.parse(texto))
  )
}

function textoNaoVazio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim() !== ''
}

function dadosInvalidos(error: string): { erro: ErroPedido } {
  return { erro: { status: 400, error, codigo: 'DADOS_INVALIDOS' } }
}

/**
 * Formato do body do `POST /pedidos`. O cliente vem do token (nunca do body) e
 * qualquer campo de preço/duração enviado é ignorado — só os campos abaixo são lidos.
 */
export function validarCriacaoPedido(body: unknown): { erro: ErroPedido } | { dados: DadosCriacaoPedido } {
  const { lavaRapidoId, veiculoId, servicoIds, horario } = (body ?? {}) as Record<string, unknown>

  if (!textoNaoVazio(lavaRapidoId)) return dadosInvalidos('Informe o lava-rápido')
  if (!textoNaoVazio(veiculoId)) return dadosInvalidos('Informe o veículo')

  if (!Array.isArray(servicoIds) || servicoIds.length === 0) {
    return dadosInvalidos('Escolha ao menos um serviço')
  }
  if (servicoIds.length > MAX_SERVICOS_POR_PEDIDO) {
    return dadosInvalidos(`Escolha no máximo ${MAX_SERVICOS_POR_PEDIDO} serviços`)
  }
  if (!servicoIds.every(textoNaoVazio)) return dadosInvalidos('Lista de serviços inválida')
  if (new Set(servicoIds).size !== servicoIds.length) return dadosInvalidos('Serviço repetido no pedido')

  if (typeof horario !== 'string' || !isIsoComFusoValido(horario)) {
    return dadosInvalidos('Data e hora inválidas')
  }

  return {
    dados: {
      lavaRapidoId: lavaRapidoId.trim(),
      veiculoId: veiculoId.trim(),
      servicoIds: servicoIds as string[],
      horario: new Date(horario),
    },
  }
}

/**
 * Validação do horário do pedido, chamada pelo `criarPedido` depois das demais
 * validações e antes de gravar. Hoje só recusa horário no passado.
 *
 * PONTO DE EXTENSÃO DO I20: completar aqui com o horário de funcionamento e as
 * intercorrências (`estaAberto(lavaRapidoId, inicio, fim)` do I19, com
 * `fim = inicio + duracaoMinutos`), devolvendo `codigo: 'HORARIO_INDISPONIVEL'`.
 */
export async function validarHorarioPedido(
  _lavaRapidoId: string,
  inicio: Date,
  _duracaoMinutos: number,
  agora: Date = new Date(),
): Promise<ErroPedido | null> {
  if (inicio.getTime() <= agora.getTime()) {
    return { status: 400, error: 'Escolha uma data e hora no futuro', codigo: 'HORARIO_PASSADO' }
  }
  return null
}
