// Veículo do cliente como a API devolve (I3). Ver backend: /clientes/me/veiculos.
export interface Veiculo {
  id: string
  marca: string | null
  modelo: string
  cor: string
  /** Normalizada pelo back-end (ABC1234 ou ABC1D23). */
  placa: string
}

/** Corpo de criar/editar. Marca vazia vira `null` no back-end. */
export interface DadosVeiculo {
  marca: string
  modelo: string
  cor: string
  placa: string
}

/** Mensagem por campo inválido (validação local ou `campos` do 400 do back-end). */
export type ErrosVeiculo = Partial<Record<keyof DadosVeiculo, string>>

export function normalizeVeiculo(data: any): Veiculo {
  return {
    id: String(data.id),
    marca: data.marca == null || data.marca === '' ? null : String(data.marca),
    modelo: String(data.modelo ?? ''),
    cor: String(data.cor ?? ''),
    placa: String(data.placa ?? ''),
  }
}
