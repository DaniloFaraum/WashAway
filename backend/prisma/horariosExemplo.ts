import type { PrismaClient } from '@prisma/client'

// Horários de funcionamento de exemplo (I19), usados pelo seed.ts, pelo demo.ts
// e pelo script de dados aplicar-horarios-exemplo.ts. Hora local (America/Sao_Paulo).

export type DiaExemplo = { diaSemana: number; fechado: boolean; abertura: string | null; fechamento: string | null }

const aberto = (diaSemana: number, abertura: string, fechamento: string): DiaExemplo => ({
  diaSemana,
  fechado: false,
  abertura,
  fechamento,
})
const fechado = (diaSemana: number): DiaExemplo => ({ diaSemana, fechado: true, abertura: null, fechamento: null })

/** Seg–sex 08:00–18:00, sáb 08:00–12:00, dom fechado. */
export const HORARIO_PADRAO: DiaExemplo[] = [
  fechado(0),
  aberto(1, '08:00', '18:00'),
  aberto(2, '08:00', '18:00'),
  aberto(3, '08:00', '18:00'),
  aberto(4, '08:00', '18:00'),
  aberto(5, '08:00', '18:00'),
  aberto(6, '08:00', '12:00'),
]

/** Variação: aberto todos os dias (domingo meio período). */
export const HORARIO_TODOS_OS_DIAS: DiaExemplo[] = [
  aberto(0, '09:00', '13:00'),
  aberto(1, '07:00', '20:00'),
  aberto(2, '07:00', '20:00'),
  aberto(3, '07:00', '20:00'),
  aberto(4, '07:00', '20:00'),
  aberto(5, '07:00', '20:00'),
  aberto(6, '08:00', '18:00'),
]

/** Variação: horário estendido de segunda a sábado, domingo fechado. */
export const HORARIO_ESTENDIDO: DiaExemplo[] = [
  fechado(0),
  aberto(1, '07:00', '21:00'),
  aberto(2, '07:00', '21:00'),
  aberto(3, '07:00', '21:00'),
  aberto(4, '07:00', '21:00'),
  aberto(5, '07:00', '21:00'),
  aberto(6, '08:00', '16:00'),
]

/**
 * Cria o horário semanal do lava-rápido SÓ se ele ainda não tiver nenhum dia
 * cadastrado (nunca altera nem apaga horário existente). Devolve se criou.
 */
export async function criarHorariosSeNaoTiver(
  prisma: PrismaClient,
  lavaRapidoId: string,
  dias: DiaExemplo[] = HORARIO_PADRAO,
): Promise<boolean> {
  const existentes = await prisma.horarioFuncionamento.count({ where: { lavaRapidoId } })
  if (existentes > 0) return false
  await prisma.horarioFuncionamento.createMany({
    data: dias.map((dia) => ({ lavaRapidoId, ...dia })),
    skipDuplicates: true,
  })
  return true
}
