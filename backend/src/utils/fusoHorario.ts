/**
 * Fuso único dos lava-rápidos (decisão do I19, junto com I13/I20/I9): horários
 * de funcionamento e intercorrências são "hora local" neste fuso, independente
 * do fuso do servidor (que em produção costuma ser UTC).
 */
export const FUSO_LAVA_RAPIDOS = process.env.TZ_LAVA_RAPIDOS || 'America/Sao_Paulo'

export type PartesLocais = {
  /** "YYYY-MM-DD" no fuso local. */
  data: string
  /** 0 = domingo … 6 = sábado. */
  diaSemana: number
  /** "HH:mm" (00:00–23:59) no fuso local. */
  hora: string
}

const DIAS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Um formatador só: o fuso é único para todos os lava-rápidos.
const FORMATADOR = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO_LAVA_RAPIDOS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
})

/** Data, dia da semana e hora de `instante` no fuso dos lava-rápidos. */
export function partesLocais(instante: Date): PartesLocais {
  const partes: Record<string, string> = {}
  for (const { type, value } of FORMATADOR.formatToParts(instante)) partes[type] = value
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    diaSemana: DIAS[partes.weekday],
    hora: `${partes.hour}:${partes.minute}`,
  }
}
