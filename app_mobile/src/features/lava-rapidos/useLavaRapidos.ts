import { useEffect, useState } from 'react'
import { getLavaRapidos } from './service/lavaRapidos.service'
import type { LavaRapido } from './service/lavaRapidos.model'

export function useLavaRapidos() {
  const [lavaRapidos, setLavaRapidos] = useState<LavaRapido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getLavaRapidos()
      .then(setLavaRapidos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { lavaRapidos, loading, error }
}
