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
  }
}
