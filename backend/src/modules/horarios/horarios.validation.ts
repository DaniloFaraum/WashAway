/** Um dia do horário semanal vindo do painel (`PUT /lavaRapidos/:id/horarios`). */
export interface HorarioDiaInput {
  diaSemana: number
  fechado: boolean
  /** "HH:mm"; null quando fechado. */
  abertura: string | null
  /** "HH:mm"; null quando fechado. */
  fechamento: string | null
}

export type ResultadoHorarios = { ok: true; dias: HorarioDiaInput[] } | { ok: false; erro: string }

const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

function falha(erro: string): ResultadoHorarios {
  return { ok: false, erro }
}

/**
 * Valida o body `{ dias: [{ diaSemana, fechado, abertura?, fechamento? }] }` com
 * exatamente os 7 dias (0 = domingo … 6 = sábado). Devolve os dias na ordem 0 a 6,
 * com `abertura`/`fechamento` null nos dias fechados.
 */
export function parseHorariosInput(body: unknown): ResultadoHorarios {
  const dias = (body as { dias?: unknown } | null)?.dias
  if (!Array.isArray(dias)) {
    return falha('body inválido — precisa de { dias: [...] } com os 7 dias da semana')
  }

  const porDia = new Map<number, HorarioDiaInput>()
  for (const item of dias) {
    if (typeof item !== 'object' || item === null) return falha('Cada dia precisa ser um objeto')
    const { diaSemana, fechado, abertura, fechamento } = item as Record<string, unknown>

    if (typeof diaSemana !== 'number' || !Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
      return falha('diaSemana deve ser um número de 0 (domingo) a 6 (sábado)')
    }
    const nome = NOMES_DIAS[diaSemana]
    if (porDia.has(diaSemana)) return falha(`O dia ${nome} foi informado mais de uma vez`)
    if (typeof fechado !== 'boolean') return falha(`Informe se ${nome} está fechado (fechado: true/false)`)

    const temAbertura = abertura !== undefined && abertura !== null && abertura !== ''
    const temFechamento = fechamento !== undefined && fechamento !== null && fechamento !== ''

    if (fechado) {
      if (temAbertura || temFechamento) {
        return falha(`Dia fechado (${nome}) não pode ter abertura nem fechamento`)
      }
      porDia.set(diaSemana, { diaSemana, fechado, abertura: null, fechamento: null })
      continue
    }

    if (!temAbertura || !temFechamento) return falha(`Informe abertura e fechamento de ${nome}`)
    if (typeof abertura !== 'string' || !HORA.test(abertura) || typeof fechamento !== 'string' || !HORA.test(fechamento)) {
      return falha(`Horário de ${nome} deve estar no formato HH:mm (00:00 a 23:59)`)
    }
    // "HH:mm" com zero à esquerda: a comparação de texto é a comparação de horário.
    if (abertura >= fechamento) return falha(`Abertura de ${nome} deve ser antes do fechamento`)

    porDia.set(diaSemana, { diaSemana, fechado, abertura, fechamento })
  }

  const faltando = NOMES_DIAS.filter((_, dia) => !porDia.has(dia))
  if (faltando.length > 0) return falha(`Informe os 7 dias da semana (faltando: ${faltando.join(', ')})`)

  return { ok: true, dias: Array.from({ length: 7 }, (_, dia) => porDia.get(dia)!) }
}
