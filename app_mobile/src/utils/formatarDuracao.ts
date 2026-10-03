/**
 * Formata uma duração em minutos para exibição: "40 min", "1h", "1h 30min".
 */
export function formatarDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  if (resto === 0) return `${horas}h`
  return `${horas}h ${resto}min`
}
