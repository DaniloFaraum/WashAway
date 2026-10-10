// Regra de placa do veículo do cliente (I3). Mesma regra que o app usa antes de
// enviar (app_mobile/src/features/veiculos/validarVeiculo.ts).

// Depois de normalizar: formato antigo (ABC1234) ou Mercosul (ABC1D23).
const PLACA_ANTIGA = /^[A-Z]{3}[0-9]{4}$/
const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/

/** Placa como é gravada e comparada: sem hífen, sem espaços, em maiúsculas. */
export function normalizarPlaca(placa: string): string {
  return placa.replace(/[\s-]/g, '').toUpperCase()
}

/** Aceita o formato antigo (ABC-1234) ou o Mercosul (ABC1D23), com ou sem hífen/espaços e em qualquer caixa. */
export function isPlacaValida(placa: string): boolean {
  const normalizada = normalizarPlaca(placa)
  return PLACA_ANTIGA.test(normalizada) || PLACA_MERCOSUL.test(normalizada)
}
