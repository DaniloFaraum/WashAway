import { useSyncExternalStore } from 'react'

/**
 * Carrinho de serviços (combos) selecionados, compartilhado entre a lista de
 * serviços (`app/servicos.tsx`) e o detalhe do serviço
 * (`app/servicos/[servicoId].tsx`), para que "Selecionar" no detalhe marque o
 * mesmo serviço na lista. A seleção vale para um lava-rápido por vez: trocar de
 * lava-rápido começa um carrinho vazio. Fica em memória (não persiste).
 *
 * O I13 deve gravar esta seleção no estado do fluxo do pedido ao "Avançar".
 */
interface EstadoCarrinho {
  lavaRapidoId: string | null
  ids: ReadonlySet<string>
}

const VAZIO: ReadonlySet<string> = new Set()

let estado: EstadoCarrinho = { lavaRapidoId: null, ids: VAZIO }
const ouvintes = new Set<() => void>()

function emitir(novo: EstadoCarrinho) {
  estado = novo
  ouvintes.forEach((ouvinte) => ouvinte())
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export function getServicosSelecionados(lavaRapidoId: string | undefined): ReadonlySet<string> {
  return lavaRapidoId && estado.lavaRapidoId === lavaRapidoId ? estado.ids : VAZIO
}

function idsDoLavaRapido(lavaRapidoId: string): Set<string> {
  return new Set(getServicosSelecionados(lavaRapidoId))
}

export function alternarServicoSelecionado(lavaRapidoId: string, servicoId: string) {
  const ids = idsDoLavaRapido(lavaRapidoId)
  if (ids.has(servicoId)) {
    ids.delete(servicoId)
  } else {
    ids.add(servicoId)
  }
  emitir({ lavaRapidoId, ids })
}

export function selecionarServico(lavaRapidoId: string, servicoId: string) {
  const ids = idsDoLavaRapido(lavaRapidoId)
  if (ids.has(servicoId)) return
  ids.add(servicoId)
  emitir({ lavaRapidoId, ids })
}

export function limparServicosSelecionados() {
  emitir({ lavaRapidoId: null, ids: VAZIO })
}

export function useServicosSelecionados(lavaRapidoId: string | undefined) {
  const selecionados = useSyncExternalStore(
    inscrever,
    () => getServicosSelecionados(lavaRapidoId),
    () => getServicosSelecionados(lavaRapidoId),
  )

  return {
    selecionados,
    alternar: (servicoId: string) => {
      if (lavaRapidoId) alternarServicoSelecionado(lavaRapidoId, servicoId)
    },
    selecionar: (servicoId: string) => {
      if (lavaRapidoId) selecionarServico(lavaRapidoId, servicoId)
    },
  }
}
