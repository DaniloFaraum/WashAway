/** Um dia do horário de funcionamento (I19). Hora local "HH:mm". */
export interface HorarioDia {
  diaSemana: number // 0 = domingo … 6 = sábado
  fechado: boolean
  abertura: string | null
  fechamento: string | null
  // false = dia sem horário cadastrado (sem restrição de horário)
  definido: boolean
}

export interface LavaRapido {
  id: string
  name: string
  address: string | null
  rating: number
  reviewsCount: number
  distance: string
  time: string
  // "A partir de": menor preço entre os serviços ativos, calculado no backend;
  // null quando a loja não tem nenhum serviço ativo.
  price: number | null
  isOpen: boolean
  image: string
  latitude: number
  longitude: number
  // Só vem em GET /lavaRapidos/:id (os 7 dias); na listagem fica [].
  horarios: HorarioDia[]
}

function normalizeHorarioDia(raw: any): HorarioDia {
  return {
    diaSemana: Number(raw?.diaSemana) || 0,
    fechado: Boolean(raw?.fechado),
    abertura: raw?.abertura ?? null,
    fechamento: raw?.fechamento ?? null,
    definido: raw?.definido ?? true,
  }
}

export function normalizeLavaRapido(raw: any): LavaRapido {
  return {
    id: String(raw.id),
    name: raw.name ?? '',
    address: raw.address ?? null,
    rating: Number(raw.rating) || 0,
    reviewsCount: Number(raw.reviewsCount) || 0,
    distance: raw.distance ?? '',
    time: raw.time ?? '',
    price: raw.price == null ? null : Number(raw.price) || 0,
    isOpen: Boolean(raw.isOpen),
    image: raw.image ?? '',
    latitude: Number(raw.latitude) || 0,
    longitude: Number(raw.longitude) || 0,
    horarios: Array.isArray(raw.horarios) ? raw.horarios.map(normalizeHorarioDia) : [],
  }
}
