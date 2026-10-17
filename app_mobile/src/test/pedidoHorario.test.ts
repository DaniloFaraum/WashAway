import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Intercorrencia } from '../features/intercorrencias/service/intercorrencias.model'
import type { HorarioDia } from '../features/lava-rapidos/service/lavaRapidos.model'
import { avisosDeFechamentoNoDia, isRecusaDeHorario, textoHorarioNoDia } from '../features/pedidos/horarioDoDia'
import { criarPedido, PedidoRecusadoError } from '../features/pedidos/service/pedidos.service'
import {
  escolherHorario,
  escolherVeiculo,
  getNovoPedido,
  iniciarNovoPedido,
  limparNovoPedido,
  marcarHorarioRecusado,
} from '../features/pedidos/useNovoPedido'

// I20: recusa do pedido pelo horário (400 HORARIO_INDISPONIVEL) e horário do dia no passo "Data e hora".

function resposta(status: number, corpo: unknown = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as Response
}

const PAYLOAD = { lavaRapidoId: 'lr1', veiculoId: 'v1', servicoIds: ['s1'], horario: '2026-10-26T17:45:00-03:00' }
const MENSAGEM = 'Nesse dia o lava-rápido fecha às 18:00. O atendimento escolhido termina às 18:15.'

// 2026-10-26 é segunda; 2026-10-25, domingo.
const SEMANA: HorarioDia[] = [
  { diaSemana: 0, definido: true, fechado: true, abertura: null, fechamento: null },
  ...[1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, definido: true, fechado: false, abertura: '08:00', fechamento: '18:00' })),
  { diaSemana: 6, definido: false, fechado: false, abertura: null, fechamento: null },
]

function intercorrencia(dados: Partial<Intercorrencia>): Intercorrencia {
  return {
    id: 'i1', lavaRapidoId: 'lr1', data: '2026-10-26', motivo: 'Falta de água',
    diaInteiro: true, horaInicio: null, horaFim: null, reaberta: false, ...dados,
  }
}

describe('criarPedido: recusa pelo horário (I20)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('400 HORARIO_INDISPONIVEL vira PedidoRecusadoError com a mensagem do backend', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(400, { error: MENSAGEM, codigo: 'HORARIO_INDISPONIVEL' }))

    const erro = await criarPedido(PAYLOAD).catch((e) => e)

    expect(erro).toBeInstanceOf(PedidoRecusadoError)
    expect(erro).toMatchObject({ message: MENSAGEM, codigo: 'HORARIO_INDISPONIVEL', status: 400 })
    expect(isRecusaDeHorario(erro)).toBe(true)
  })

  it('outras recusas não são recusa de horário (ficam no resumo)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(resposta(400, { error: 'x', codigo: 'SERVICO_INVALIDO' }))

    const erro = await criarPedido(PAYLOAD).catch((e) => e)

    expect(isRecusaDeHorario(erro)).toBe(false)
    expect(isRecusaDeHorario(new Error('rede'))).toBe(false)
  })
})

describe('estado do fluxo depois da recusa pelo horário', () => {
  afterEach(() => limparNovoPedido())

  it('mantém serviços, veículo e horário e guarda a mensagem até o cliente confirmar um horário de novo', () => {
    const servicos = [{ id: 's1', nome: 'Completa', preco: 40, duracaoMinutos: 30 }]
    const veiculo = { id: 'v1', marca: 'Fiat', modelo: 'Argo', cor: 'Branco', placa: 'ABC1D23' }
    iniciarNovoPedido({ id: 'lr1', nome: 'Lava 1', endereco: null }, servicos)
    escolherVeiculo(veiculo)
    escolherHorario(PAYLOAD.horario)

    marcarHorarioRecusado(MENSAGEM)
    expect(getNovoPedido()).toMatchObject({ servicos, veiculo, horario: PAYLOAD.horario, erroHorario: MENSAGEM })

    escolherHorario('2026-10-26T10:00:00-03:00')
    expect(getNovoPedido()).toMatchObject({ servicos, veiculo, horario: '2026-10-26T10:00:00-03:00', erroHorario: null })
  })
})

describe('textoHorarioNoDia', () => {
  it.each([
    ['2026-10-26', 'Horário nesse dia: 08:00–18:00'],
    ['2026-10-25', 'Fechado nesse dia'],
    ['2026-10-31', 'Horário não informado nesse dia'],
  ])('%s → %s', (data, texto) => {
    expect(textoHorarioNoDia(SEMANA, data)).toBe(texto)
  })

  it('lava-rápido sem horário cadastrado: não mostra nada', () => {
    expect(textoHorarioNoDia([], '2026-10-26')).toBeNull()
  })
})

describe('avisosDeFechamentoNoDia', () => {
  it('lista os fechamentos do dia (inteiro e parcial) e ignora reabertos e outros dias', () => {
    const lista = [
      intercorrencia({ id: 'a', motivo: 'Feriado local' }),
      intercorrencia({ id: 'b', diaInteiro: false, horaInicio: '14:00', horaFim: '16:00' }),
      intercorrencia({ id: 'c', reaberta: true, motivo: 'Reaberta' }),
      intercorrencia({ id: 'd', data: '2026-10-27', motivo: 'Outro dia' }),
    ]

    expect(avisosDeFechamentoNoDia(lista, '2026-10-26')).toEqual([
      'Atenção: fechado nesse dia (Feriado local)',
      'Atenção: fechado das 14:00 às 16:00 (Falta de água)',
    ])
  })
})
