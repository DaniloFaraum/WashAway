// Formatação do horário de funcionamento (I19) no painel — mesma regra do app
// (app_mobile/src/features/lava-rapidos/formatarHorario.ts).

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
 * "08:00–18:00", "Fechado" ou, para dia sem horário cadastrado, "Não informado".
 * @param {import('../../login/service/lavaRapidos.model.js').HorarioDia | undefined} horario
 * @returns {string}
 */
export function formatarHorarioDoDia(horario) {
  if (!horario || !horario.definido) return 'Não informado'
  if (horario.fechado || !horario.abertura || !horario.fechamento) return 'Fechado'
  return `${horario.abertura}–${horario.fechamento}`
}
