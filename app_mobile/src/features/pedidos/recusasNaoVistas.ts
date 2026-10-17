import { useSyncExternalStore } from 'react'
import { contarRecusasNaoVistas } from './service/pedidos.service'

/**
 * Contador de pedidos recusados que o cliente ainda não viu (I18), mostrado
 * como badge no botão de conta (`MenuConta`). Store de módulo (mesmo padrão
 * do carrinho): quem busca (menu de conta, "Meus pedidos", detalhe) chama
 * `atualizarRecusasNaoVistas()`, e todos os badges mudam juntos. Sem push nem
 * tempo real: atualiza ao abrir o app, ao focar a Home e ao puxar a lista.
 */
let total = 0
const ouvintes = new Set<() => void>()

function emitir(novo: number) {
  if (novo === total) return
  total = novo
  ouvintes.forEach((ouvinte) => ouvinte())
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export function getRecusasNaoVistas(): number {
  return total
}

/** Busca o contador no backend. Erro (rede/401) mantém o valor atual: o badge não é motivo para alertar. */
export async function atualizarRecusasNaoVistas(): Promise<number> {
  try {
    emitir(await contarRecusasNaoVistas())
  } catch {
    // mantém o último valor conhecido
  }
  return total
}

/** Zera ao sair da conta (o próximo cliente começa sem badge). */
export function limparRecusasNaoVistas() {
  emitir(0)
}

export function useRecusasNaoVistas(): number {
  return useSyncExternalStore(inscrever, getRecusasNaoVistas, getRecusasNaoVistas)
}
