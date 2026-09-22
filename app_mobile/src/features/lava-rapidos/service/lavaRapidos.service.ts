import { LAVA_RAPIDOS_ROUTES } from './lavaRapidos.routes'
import { normalizeLavaRapido, type LavaRapido } from './lavaRapidos.model'
import { BACKEND_API_BASE_URL } from '@/config/api'

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? BACKEND_API_BASE_URL

async function request(path: string, options?: RequestInit): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, options)
  if (!response.ok) {
    throw new Error(`Falha na requisição ${path}: ${response.status}`)
  }
  return response.json()
}

export async function getLavaRapidos(): Promise<LavaRapido[]> {
  const data = await request(LAVA_RAPIDOS_ROUTES.list)
  return data.map(normalizeLavaRapido)
}
