import { useEffect, useState } from 'react'
import { getIntercorrencias } from './service/intercorrencias.service'
import type { Intercorrencia } from './service/intercorrencias.model'

const DIAS_AVISO = 3

function paraData(data: string): Date {
  return new Date(`${data}T00:00:00`)
}

/** Quantos dias faltam de `hoje` até `data` (string "YYYY-MM-DD"); negativo se já passou. */
export function diasAte(data: string, hoje: Date = new Date()): number {
  const umDiaEmMs = 24 * 60 * 60 * 1000
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.round((paraData(data).getTime() - inicioHoje.getTime()) / umDiaEmMs)
}

/** Intercorrência de hoje, ou a mais próxima dentro dos próximos `DIAS_AVISO` dias — ou `null`. */
export function getIntercorrenciaRelevante(
  intercorrencias: Intercorrencia[],
  hoje: Date = new Date()
): Intercorrencia | null {
  const futuras = intercorrencias
    .map((item) => ({ item, dias: diasAte(item.data, hoje) }))
    .filter(({ dias }) => dias >= 0 && dias <= DIAS_AVISO)
    .sort((a, b) => a.dias - b.dias)

  return futuras.length > 0 ? futuras[0].item : null
}

export function useIntercorrencias(lavaRapidoId?: string) {
  const [intercorrencias, setIntercorrencias] = useState<Intercorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lavaRapidoId) {
      setIntercorrencias([])
      setLoading(false)
      return
    }

    setLoading(true)
    getIntercorrencias(lavaRapidoId)
      .then(setIntercorrencias)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [lavaRapidoId])

  return { intercorrencias, loading, error }
}
