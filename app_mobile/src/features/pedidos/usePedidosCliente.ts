import { useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { atualizarRecusasNaoVistas } from './recusasNaoVistas'
import { listarMeusPedidos } from './service/pedidos.service'
import type { PedidoCliente } from './service/pedidos.model'

/**
 * Pedidos do cliente logado (I18). Sempre busca no backend ao focar a tela e
 * no `recarregar()` (pull-to-refresh) — o status mostrado é o do servidor.
 * Cada busca também atualiza o contador de recusas não vistas.
 */
export function usePedidosCliente() {
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Resposta atrasada de uma busca antiga não sobrescreve a mais nova.
  const ultimaBusca = useRef(0)

  const carregar = useCallback(async (puxou: boolean) => {
    const busca = ++ultimaBusca.current
    if (puxou) setAtualizando(true)
    void atualizarRecusasNaoVistas()
    try {
      const lista = await listarMeusPedidos()
      if (busca !== ultimaBusca.current) return
      setPedidos(lista)
      setErro(null)
    } catch (err) {
      if (busca === ultimaBusca.current) setErro(err instanceof Error ? err.message : 'Não foi possível carregar seus pedidos.')
    } finally {
      if (busca === ultimaBusca.current) {
        setCarregando(false)
        setAtualizando(false)
      }
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void carregar(false)
      return () => {
        // Saiu da tela: ignora respostas pendentes.
        ultimaBusca.current += 1
      }
    }, [carregar]),
  )

  const recarregar = useCallback(() => carregar(true), [carregar])

  return { pedidos, carregando, atualizando, erro, recarregar }
}
