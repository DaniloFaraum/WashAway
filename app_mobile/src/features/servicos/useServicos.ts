import { useEffect, useState } from 'react'
import { getServicos } from './service/servicos.service'
import type { Servico } from './service/servicos.model'

export function filtrarServicosAtivos(servicos: Servico[]): Servico[] {
  return servicos.filter((servico) => servico.ativo)
}

export function useServicos(lavaRapidoId?: string) {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lavaRapidoId) {
      setServicos([])
      setLoading(false)
      return
    }

    setLoading(true)
    getServicos(lavaRapidoId)
      .then((data) => setServicos(filtrarServicosAtivos(data)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [lavaRapidoId])

  return { servicos, loading, error }
}
