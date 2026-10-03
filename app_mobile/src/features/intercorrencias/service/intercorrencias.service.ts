import { INTERCORRENCIAS_ROUTES } from './intercorrencias.routes'
import { normalizeIntercorrencia, type Intercorrencia } from './intercorrencias.model'
import { BACKEND_API_BASE_URL } from '@/config/api'

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? BACKEND_API_BASE_URL

async function request(path: string, options?: RequestInit): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, options)
  if (!response.ok) {
    throw new Error(`Falha na requisição ${path}: ${response.status}`)
  }
  return response.json()
}

export async function getIntercorrencias(lavaRapidoId: string): Promise<Intercorrencia[]> {
  const data = await request(`${INTERCORRENCIAS_ROUTES.list}?lavaRapidoId=${lavaRapidoId}`)
  return data.map(normalizeIntercorrencia)
}
