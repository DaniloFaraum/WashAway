import { useEffect, useState } from 'react'
import { getLavaRapidos } from './service/lavaRapidos.service'
import type { LavaRapido } from './service/lavaRapidos.model'

interface Resultado {
  /** Horário a que a resposta se refere (`null` = sem filtro). */
  horario: string | null
  lavaRapidos: LavaRapido[]
  error: string | null
}

/**
 * Lava-rápidos da Home. Com `horario` (ISO com offset, I9), o backend devolve
 * só os abertos naquele instante; trocar o horário refaz a busca. `loading`
 * vale enquanto a resposta não é a do horário atual (uma resposta atrasada de
 * um horário anterior é descartada).
 */
export function useLavaRapidos(horario?: string | null) {
  const chave = horario ?? null
  const [resultado, setResultado] = useState<Resultado | null>(null)

  useEffect(() => {
    let ativo = true
    getLavaRapidos(chave)
      .then((lavaRapidos) => {
        if (ativo) setResultado({ horario: chave, lavaRapidos, error: null })
      })
      .catch((err) => {
        if (ativo) setResultado({ horario: chave, lavaRapidos: [], error: err.message })
      })
    return () => {
      ativo = false
    }
  }, [chave])

  const atual = resultado?.horario === chave ? resultado : null
  return { lavaRapidos: atual?.lavaRapidos ?? [], loading: atual === null, error: atual?.error ?? null }
}
