import { useEffect, useState } from 'react'
import { getLavaRapido } from './service/lavaRapidos.service'
import type { LavaRapido } from './service/lavaRapidos.model'

export function useLavaRapido(id?: string) {
  const [lavaRapido, setLavaRapido] = useState<LavaRapido | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLavaRapido(null)
      setLoading(false)
      return
    }

    setLoading(true)
    getLavaRapido(id)
      .then(setLavaRapido)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return { lavaRapido, loading, error }
}
