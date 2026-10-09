import type { Prisma, TipoEventoEmail } from '@prisma/client'

/** Canal do Postgres `LISTEN/NOTIFY` escutado pelo worker (scripts/email_worker.py). */
export const CANAL_EMAIL_PENDENTE = 'email_pendente'

export type DadosEmail = {
  tipo: TipoEventoEmail
  destinatario: string
  assunto: string
  /** Texto simples. Pode conter senha gerada — o worker mascara depois de enviar. */
  corpo: string
}

/**
 * Enfileira um e-mail no outbox (`EventoEmail`), dentro da transação da ação
 * que o originou: se a transação der rollback, o e-mail não existe; se der
 * commit, ele fica `pendente` até o worker Python enviar.
 *
 * Única porta de saída de e-mail do backend — nenhum módulo envia direto.
 *
 * O `pg_notify` roda dentro da mesma transação, e o Postgres só entrega a
 * notificação no commit: o worker acorda na hora, e nunca por um evento
 * que acabou desfeito. (Se a notificação se perder, a varredura periódica do
 * worker pega o evento.)
 */
export async function enfileirarEmail(tx: Prisma.TransactionClient, dados: DadosEmail) {
  const evento = await tx.eventoEmail.create({
    data: {
      tipo: dados.tipo,
      destinatario: dados.destinatario,
      assunto: dados.assunto,
      corpo: dados.corpo,
    },
    select: { id: true, tipo: true, destinatario: true, status: true, criadoEm: true },
  })

  await tx.$executeRaw`SELECT pg_notify(${CANAL_EMAIL_PENDENTE}, ${evento.id})`

  return evento
}
