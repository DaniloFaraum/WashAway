// Busca por horário (I9): o horário escolhido na Home precisa estar no futuro e
// em até 30 dias. O SeletorDataHora já esconde o passado e mostra só 30 dias;
// isto protege o "Aplicar" quando o relógio passa do horário com o modal
// aberto. O backend valida de novo (`GET /lavaRapidos?horario=`).

export const DIAS_MAX_BUSCA = 30

/** `null` se o horário vale para a busca; senão a mensagem para o cliente. */
export function validarHorarioBusca(horario: Date, agora: Date): string | null {
  if (Number.isNaN(horario.getTime()) || horario.getTime() <= agora.getTime()) {
    return 'Escolha um horário no futuro'
  }
  if (horario.getTime() > agora.getTime() + DIAS_MAX_BUSCA * 24 * 60 * 60 * 1000) {
    return `Escolha uma data em até ${DIAS_MAX_BUSCA} dias`
  }
  return null
}
