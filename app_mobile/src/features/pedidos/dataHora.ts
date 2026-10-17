// Data e hora do pedido (I13, decisão D4/D5): o negócio usa o fuso
// America/Sao_Paulo, que desde 2019 não tem horário de verão (UTC−03:00 o ano
// todo). Por isso o app trabalha com o deslocamento fixo abaixo, sem depender
// do fuso do aparelho nem do suporte a Intl/timeZone do Hermes: o cliente
// escolhe "dia + hora local" e o app envia ISO com offset
// (ex.: "2026-10-20T10:00:00-03:00"); o backend guarda em UTC.
// Reaproveitado pelo I9 (busca por horário) junto com o SeletorDataHora.

export const FUSO_NEGOCIO = 'America/Sao_Paulo'
export const OFFSET_NEGOCIO = '-03:00'
const OFFSET_MINUTOS = -3 * 60

/** Quantos dias o seletor oferece (hoje incluso). */
export const DIAS_SELECIONAVEIS = 30
/** Intervalo entre horários do seletor. */
export const INTERVALO_MINUTOS = 30
/** Primeiro e último horário oferecidos (hora local). O I20 confere o funcionamento de cada lava-rápido. */
export const PRIMEIRO_HORARIO = '06:00'
export const ULTIMO_HORARIO = '22:00'

const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** "YYYY-MM-DD" e "HH:mm" de um instante no fuso do negócio. */
export function partesNoFuso(instante: Date): { data: string; hora: string; diaSemana: number } {
  const local = new Date(instante.getTime() + OFFSET_MINUTOS * 60 * 1000)
  const iso = local.toISOString() // lido como UTC = hora local de São Paulo
  return { data: iso.slice(0, 10), hora: iso.slice(11, 16), diaSemana: local.getUTCDay() }
}

/** Soma `dias` a uma data "YYYY-MM-DD" (calendário puro, sem fuso). */
export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10)
}

/** 0 = domingo … 6 = sábado, de uma data "YYYY-MM-DD". */
export function diaDaSemana(data: string): number {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}

export interface DiaSelecionavel {
  /** "YYYY-MM-DD" */
  data: string
  /** "Hoje", "Amanhã" ou o dia da semana ("qua"). */
  rotulo: string
  /** "22/10" */
  diaMes: string
}

/** Os próximos `quantidade` dias (hoje primeiro) no fuso do negócio. */
export function proximosDias(agora: Date, quantidade = DIAS_SELECIONAVEIS): DiaSelecionavel[] {
  const hoje = partesNoFuso(agora).data
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = somarDias(hoje, indice)
    const rotulo = indice === 0 ? 'Hoje' : indice === 1 ? 'Amanhã' : DIAS_SEMANA_CURTO[diaDaSemana(data)]
    return { data, rotulo, diaMes: `${data.slice(8, 10)}/${data.slice(5, 7)}` }
  })
}

function paraMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function paraHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`
}

/** Todos os horários do seletor ("06:00", "06:30", … "22:00"). */
export function horariosDoDia(): string[] {
  const horarios: string[] = []
  for (let m = paraMinutos(PRIMEIRO_HORARIO); m <= paraMinutos(ULTIMO_HORARIO); m += INTERVALO_MINUTOS) {
    horarios.push(paraHora(m))
  }
  return horarios
}

/** ISO com o offset do negócio: ("2026-10-20", "10:00") → "2026-10-20T10:00:00-03:00". */
export function montarHorarioIso(data: string, hora: string): string {
  return `${data}T${hora}:00${OFFSET_NEGOCIO}`
}

/** `true` se o dia + hora (local do negócio) ainda não passou. */
export function isNoFuturo(data: string, hora: string, agora: Date): boolean {
  return new Date(montarHorarioIso(data, hora)).getTime() > agora.getTime()
}

/** Horários de `data` ainda disponíveis (no futuro em relação a `agora`). */
export function horariosDisponiveis(data: string, agora: Date): string[] {
  return horariosDoDia().filter((hora) => isNoFuturo(data, hora, agora))
}

/** "qua, 22/10 às 10:00" a partir do ISO do pedido (exibido no fuso do negócio). */
export function formatarDataHora(iso: string): string {
  const instante = new Date(iso)
  if (Number.isNaN(instante.getTime())) return ''
  const { data, hora, diaSemana } = partesNoFuso(instante)
  return `${DIAS_SEMANA_CURTO[diaSemana]}, ${data.slice(8, 10)}/${data.slice(5, 7)} às ${hora}`
}

/** "YYYY-MM-DD" + "HH:mm" de volta a partir do ISO (para pré-preencher o seletor). */
export function separarHorarioIso(iso: string): { data: string; hora: string } | null {
  const instante = new Date(iso)
  if (Number.isNaN(instante.getTime())) return null
  const { data, hora } = partesNoFuso(instante)
  return { data, hora }
}
