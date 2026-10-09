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

const formatadores = new Map<string, Intl.DateTimeFormat>()

function formatador(fuso: string): Intl.DateTimeFormat {
  let f = formatadores.get(fuso)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
    formatadores.set(fuso, f)
  }
  return f
}

/** Data, dia da semana e hora de `instante` no fuso dos lava-rápidos. */
export function partesLocais(instante: Date, fuso: string = FUSO_LAVA_RAPIDOS): PartesLocais {
  const partes: Record<string, string> = {}
  for (const { type, value } of formatador(fuso).formatToParts(instante)) partes[type] = value
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    diaSemana: DIAS[partes.weekday],
    hora: `${partes.hour}:${partes.minute}`,
  }
}
