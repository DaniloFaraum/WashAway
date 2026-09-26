import { useCallback, useEffect, useState } from 'react'
import { clearEmpresaSelecionada, getEmpresaSelecionada } from './empresaSelecionada.storage'

/**
 * Checa se o consumidor já escolheu uma empresa (lava-rápido) no onboarding.
 */
export function useEmpresaSelecionadaGate() {
  const [pronto, setPronto] = useState(false)
  const [temEmpresaSelecionada, setTemEmpresaSelecionada] = useState(false)

  useEffect(() => {
    getEmpresaSelecionada().then((id) => {
      setTemEmpresaSelecionada(Boolean(id))
      setPronto(true)
    })
  }, [])

  const trocarEmpresa = useCallback(async () => {
    await clearEmpresaSelecionada()
    setTemEmpresaSelecionada(false)
  }, [])

  return { pronto, temEmpresaSelecionada, trocarEmpresa }
}
