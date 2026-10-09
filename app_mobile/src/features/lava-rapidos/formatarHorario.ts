import type { HorarioDia } from './service/lavaRapidos.model'

// Formatação do horário de funcionamento (I19) para a tela de serviços.

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// A semana é mostrada começando na segunda.
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0]

/** "08:00–18:00", "Fechado" ou, para dia sem horário cadastrado, "Horário não informado". */
export function formatarHorarioDoDia(horario: HorarioDia | undefined): string {
  if (!horario || !horario.definido) return 'Horário não informado'
  if (horario.fechado || !horario.abertura || !horario.fechamento) return 'Fechado'
  return `${horario.abertura}–${horario.fechamento}`
}

/** Algum dia tem horário cadastrado? (sem nenhum, a tela não mostra horário). */
export function temHorarioDefinido(horarios: HorarioDia[]): boolean {
  return horarios.some((horario) => horario.definido)
}

/** Horário do dia da semana de `agora` (padrão: hoje). */
export function horarioDeHoje(horarios: HorarioDia[], agora: Date = new Date()): HorarioDia | undefined {
  return horarios.find((horario) => horario.diaSemana === agora.getDay())
}

/**
 * Linhas da semana, agrupando dias seguidos (de segunda a domingo) com o mesmo
 * horário: ["Seg a sex: 08:00–18:00", "Sáb: 08:00–12:00", "Dom: fechado"].
 */
export function resumirSemana(horarios: HorarioDia[]): string[] {
  const porDia = new Map(horarios.map((horario) => [horario.diaSemana, horario]))
  const grupos: { dias: number[]; texto: string }[] = []

  for (const dia of ORDEM_SEMANA) {
    const texto = formatarHorarioDoDia(porDia.get(dia))
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.texto === texto) ultimo.dias.push(dia)
    else grupos.push({ dias: [dia], texto })
  }

  return grupos.map(({ dias, texto }) => {
    const primeiro = NOMES_DIAS[dias[0]]
    const rotulo = dias.length === 1 ? primeiro : `${primeiro} a ${NOMES_DIAS[dias[dias.length - 1]].toLowerCase()}`
    const valor = texto === 'Fechado' ? 'fechado' : texto === 'Horário não informado' ? 'não informado' : texto
    return `${rotulo}: ${valor}`
  })
}
