import { useCallback } from 'react'
import { clearEmpresaSelecionada } from './empresaSelecionada.storage'

/**
 * Ação de trocar de lava-rápido (limpa a empresa selecionada). Separado de
 * `useEmpresaSelecionadaGate` porque quem só precisa da ação (ex.: a Home)
 * não deveria pagar o custo da checagem do gate (usada só em `_layout.tsx`).
 */
export function useTrocarEmpresa() {
  const trocarEmpresa = useCallback(async () => {
    await clearEmpresaSelecionada()
  }, [])

  return { trocarEmpresa }
}
