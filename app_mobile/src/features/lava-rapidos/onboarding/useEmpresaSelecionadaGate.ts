import { useEffect, useState } from 'react'
import { getEmpresaSelecionada } from './empresaSelecionada.storage'

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

  return { pronto, temEmpresaSelecionada }
}
