import { PedidoStatus } from '@prisma/client'
import { estaAberto, type MotivoFechado } from '../horarios/disponibilidade.service.js'
import { partesLocais } from '../../utils/fusoHorario.js'

export function isValidStatus(status: unknown): status is PedidoStatus {
  return typeof status === 'string' && (Object.values(PedidoStatus) as string[]).includes(status)
}

// ---------------------------------------------------------------------------
// Criação de pedido (I13, `POST /pedidos`)
// ---------------------------------------------------------------------------

/**
 * Códigos estáveis das recusas do `POST /pedidos` (corpo `{ error, codigo }`).
 * 'HORARIO_INDISPONIVEL' (I20): fora do horário de funcionamento ou num fechamento.
 */
export type CodigoErroPedido =
  | 'DADOS_INVALIDOS'
  | 'HORARIO_PASSADO'
  | 'HORARIO_INDISPONIVEL'
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
 * Mensagem da recusa por horário (I20), em hora local (FUSO_LAVA_RAPIDOS), a
 * partir do motivo devolvido pelo `estaAberto` do I19. Lógica pura.
 */
export function mensagemHorarioIndisponivel(motivo: MotivoFechado, inicio: Date, fim: Date): string {
  const localInicio = partesLocais(inicio)
  const localFim = partesLocais(fim)

  if (motivo.tipo === 'intercorrencia') {
    const { diaInteiro, horaInicio, horaFim, motivo: texto } = motivo.intercorrencia
    if (diaInteiro || !horaInicio || !horaFim) return `O lava-rápido estará fechado nesse dia: ${texto}.`
    return `O lava-rápido estará fechado das ${horaInicio} às ${horaFim} nesse dia: ${texto}.`
  }

  // O I19 trata o atendimento que atravessa a meia-noite como fechado.
  if (localFim.data !== localInicio.data) {
    return `O atendimento escolhido termina só no dia seguinte, às ${localFim.hora}. Escolha um horário mais cedo.`
  }
  if (!motivo.horario) return 'O lava-rápido não abre nesse dia.'
  if (localInicio.hora < motivo.horario.abertura) return `Nesse dia o lava-rápido abre às ${motivo.horario.abertura}.`
  return `Nesse dia o lava-rápido fecha às ${motivo.horario.fechamento}. O atendimento escolhido termina às ${localFim.hora}.`
}

/**
 * Validação do horário do pedido, chamada pelo `criarPedido` depois das demais
 * validações e antes de gravar:
 * - no passado (ou agora) → `HORARIO_PASSADO`;
 * - período [inicio, inicio + duracaoMinutos) fora do horário de funcionamento
 *   do dia ou num fechamento não reaberto (`estaAberto` do I19) →
 *   `HORARIO_INDISPONIVEL` (I20), com mensagem específica do caso. Lava-rápido
 *   sem horário cadastrado = sem restrição de horário (regra do I19).
 */
export async function validarHorarioPedido(
  lavaRapidoId: string,
  inicio: Date,
  duracaoMinutos: number,
  agora: Date = new Date(),
): Promise<ErroPedido | null> {
  if (inicio.getTime() <= agora.getTime()) {
    return { status: 400, error: 'Escolha uma data e hora no futuro', codigo: 'HORARIO_PASSADO' }
  }

  // Duração 0 (combo sem itens): o intervalo vazio [inicio, inicio) seria
  // "fora do horário" no I19, então avalia só o instante de início.
  const fim = duracaoMinutos > 0 ? new Date(inicio.getTime() + duracaoMinutos * 60 * 1000) : undefined
  const disponibilidade = await estaAberto(lavaRapidoId, inicio, fim)
  if (!disponibilidade.aberto) {
    return {
      status: 400,
      error: mensagemHorarioIndisponivel(disponibilidade.motivo, inicio, fim ?? inicio),
      codigo: 'HORARIO_INDISPONIVEL',
    }
  }
  return null
}
