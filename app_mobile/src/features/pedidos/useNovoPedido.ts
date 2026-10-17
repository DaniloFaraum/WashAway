import { useSyncExternalStore } from 'react'
import type { Veiculo } from '@/features/veiculos/service/veiculos.model'

/**
 * Estado do fluxo "novo pedido" (I13, decisão D3): Serviços → Veículo → Data e
 * hora → Resumo. Fica em memória (store de módulo, como o carrinho de
 * `servicosSelecionados.ts`), então sobrevive à navegação entre os passos, à
 * ida ao cadastro de veículo e a um erro no envio; é perdido se o app fechar.
 *
 * Os valores de preço/duração aqui servem SÓ para exibir: o backend recalcula
 * tudo a partir dos ids (ver `montarPayloadPedido`).
 */

export interface LavaRapidoDoPedido {
  id: string
  nome: string
  endereco: string | null
}

export interface ServicoDoPedido {
  id: string
  nome: string
  preco: number
  duracaoMinutos: number
}

export interface EstadoNovoPedido {
  lavaRapido: LavaRapidoDoPedido | null
  servicos: ServicoDoPedido[]
  veiculo: Veiculo | null
  /** ISO com offset do negócio (ex.: "2026-10-20T10:00:00-03:00"). */
  horario: string | null
  /**
   * Mensagem do backend quando ele recusou `horario` (I20, `HORARIO_INDISPONIVEL`):
   * o passo "Data e hora" mostra o horário ainda escolhido, destacado com ela.
   * Some quando o cliente confirma um horário de novo nesse passo.
   */
  erroHorario: string | null
}

const VAZIO: EstadoNovoPedido = { lavaRapido: null, servicos: [], veiculo: null, horario: null, erroHorario: null }

let estado: EstadoNovoPedido = VAZIO
const ouvintes = new Set<() => void>()

function emitir(novo: EstadoNovoPedido) {
  estado = novo
  ouvintes.forEach((ouvinte) => ouvinte())
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export function getNovoPedido(): EstadoNovoPedido {
  return estado
}

/**
 * Começa (ou retoma) o fluxo ao "Avançar" da tela de serviços. No mesmo
 * lava-rápido, mantém veículo e data/hora já escolhidos (o cliente voltou para
 * trocar serviços); em outro, começa do zero. `horario` pré-preenchido (I9) só
 * entra se ainda não houver um escolhido.
 */
export function iniciarNovoPedido(lavaRapido: LavaRapidoDoPedido, servicos: ServicoDoPedido[], horario?: string | null) {
  const mesmo = estado.lavaRapido?.id === lavaRapido.id
  emitir({
    lavaRapido,
    servicos,
    veiculo: mesmo ? estado.veiculo : null,
    horario: (mesmo ? estado.horario : null) ?? horario ?? null,
    erroHorario: mesmo ? estado.erroHorario : null,
  })
}

export function escolherVeiculo(veiculo: Veiculo) {
  emitir({ ...estado, veiculo })
}

export function escolherHorario(horario: string | null) {
  emitir({ ...estado, horario, erroHorario: null })
}

/** O backend recusou o horário escolhido (I20): mantém o horário e guarda a mensagem para o passo "Data e hora". */
export function marcarHorarioRecusado(mensagem: string) {
  emitir({ ...estado, erroHorario: mensagem })
}

export function limparNovoPedido() {
  emitir(VAZIO)
}

/** Totais só para exibir (o backend recalcula): soma de preço e duração dos serviços. */
export function totaisDoPedido(servicos: ServicoDoPedido[]) {
  return {
    precoTotal: Math.round(servicos.reduce((total, servico) => total + servico.preco, 0) * 100) / 100,
    duracaoMinutos: servicos.reduce((total, servico) => total + servico.duracaoMinutos, 0),
  }
}

export function useNovoPedido() {
  const atual = useSyncExternalStore(inscrever, getNovoPedido, getNovoPedido)
  return {
    ...atual,
    escolherVeiculo,
    escolherHorario,
    limpar: limparNovoPedido,
  }
}
