export interface LavaRapido {
  id: string
  name: string
  rating: number
  reviewsCount: number
  distance: string
  time: string
  price: number
  isOpen: boolean
  image: string
  latitude: number
  longitude: number
}

export function normalizeLavaRapido(raw: any): LavaRapido {
  return {
    id: String(raw.id),
    name: raw.name ?? '',
    rating: Number(raw.rating) || 0,
    reviewsCount: Number(raw.reviewsCount) || 0,
    distance: raw.distance ?? '',
    time: raw.time ?? '',
    price: Number(raw.price) || 0,
    isOpen: Boolean(raw.isOpen),
    image: raw.image ?? '',
    latitude: Number(raw.latitude) || 0,
    longitude: Number(raw.longitude) || 0,
  }
}
