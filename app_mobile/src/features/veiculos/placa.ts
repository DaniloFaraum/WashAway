// Placa do veículo (I3). Mesma regra do back-end
// (backend/src/modules/veiculos-cliente/placa.ts).

const PLACA_ANTIGA = /^[A-Z]{3}[0-9]{4}$/
const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/

/** Sem hífen, sem espaços, em maiúsculas. */
export function normalizarPlaca(placa: string): string {
  return placa.replace(/[\s-]/g, '').toUpperCase()
}

/** Formato antigo (ABC-1234) ou Mercosul (ABC1D23), com ou sem hífen e em qualquer caixa. */
export function isPlacaValida(placa: string): boolean {
  const normalizada = normalizarPlaca(placa)
  return PLACA_ANTIGA.test(normalizada) || PLACA_MERCOSUL.test(normalizada)
}

/** Para exibir: placa antiga com hífen (ABC-1234); Mercosul como é (ABC1D23). */
export function formatarPlaca(placa: string): string {
  const normalizada = normalizarPlaca(placa)
  return PLACA_ANTIGA.test(normalizada) ? `${normalizada.slice(0, 3)}-${normalizada.slice(3)}` : normalizada
}
