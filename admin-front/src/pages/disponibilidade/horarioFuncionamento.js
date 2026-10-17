// Helpers puros do horário de funcionamento (I19) no painel: nomes/ordem dos dias,
// "hoje" no fuso dos lava-rápidos e conversão entre o formulário e o body do PUT.

export const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
// A semana é mostrada começando na segunda.
export const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0]

// Mesmo fuso fixo do backend (`FUSO_LAVA_RAPIDOS`): o "hoje" tem de ser o mesmo
// dia que o backend usa para o isOpen, não o fuso do navegador.
const FUSO_LAVA_RAPIDOS = 'America/Sao_Paulo'
const DIAS_EN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/**
 * Dia da semana (0 = domingo) de `instante` no fuso dos lava-rápidos.
 * @param {Date} instante
 * @returns {number}
 */
export function diaSemanaNoFuso(instante) {
  try {
    const nome = new Intl.DateTimeFormat('en-US', { timeZone: FUSO_LAVA_RAPIDOS, weekday: 'short' }).format(instante)
    return DIAS_EN[nome] ?? instante.getDay()
  } catch {
    return instante.getDay()
  }
}

/**
 * @typedef {Object} HorarioEmEdicao
 * @property {number} diaSemana
 * @property {boolean} fechado
 * @property {string} abertura - "HH:mm" ou '' (campo vazio)
 * @property {string} fechamento - "HH:mm" ou '' (campo vazio)
 */

/**
 * Estado inicial do formulário: os 7 dias (0 a 6) a partir dos horários da empresa.
 * Dia sem horário cadastrado começa aberto e com os campos vazios.
 * @param {import('../../login/service/lavaRapidos.model.js').HorarioDia[]} horarios
 * @returns {HorarioEmEdicao[]}
 */
export function horariosParaEdicao(horarios) {
  const porDia = new Map((horarios ?? []).map((horario) => [horario.diaSemana, horario]))
  return Array.from({ length: 7 }, (_, diaSemana) => {
    const horario = porDia.get(diaSemana)
    if (!horario || !horario.definido) return { diaSemana, fechado: false, abertura: '', fechamento: '' }
    return {
      diaSemana,
      fechado: horario.fechado,
      abertura: horario.fechado ? '' : (horario.abertura ?? ''),
      fechamento: horario.fechado ? '' : (horario.fechamento ?? ''),
    }
  })
}

/**
 * Body do `PUT`: dia fechado vai sem horas; dia aberto, com as horas digitadas
 * (o backend valida formato e abertura antes do fechamento).
 * @param {HorarioEmEdicao[]} edicao
 * @returns {{ diaSemana: number, fechado: boolean, abertura?: string, fechamento?: string }[]}
 */
export function edicaoParaDias(edicao) {
  return edicao.map(({ diaSemana, fechado, abertura, fechamento }) =>
    fechado ? { diaSemana, fechado } : { diaSemana, fechado, abertura, fechamento },
  )
}
