import { useEffect, useState } from 'react'

/**
 * @template T
 * @param {() => Promise<T>} fetchFn
 * @returns {{ data: T | null, setData: (updater: T | ((atual: T | null) => T)) => void, loading: boolean, error: string | null }}
 */
export function useFetch(fetchFn) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFn()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, setData, loading, error }
}
