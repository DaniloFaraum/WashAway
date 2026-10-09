import { prisma } from '../../config/prisma.js'

/**
 * E-mails que o backend enfileirou para `destinatario` (mais antigo primeiro).
 * Serve para conferir nos testes que uma ação gerou o e-mail certo, sem rodar
 * o worker Python.
 */
export function emailsEnfileirados(destinatario: string) {
  return prisma.eventoEmail.findMany({
    where: { destinatario },
    orderBy: { criadoEm: 'asc' },
  })
}

/** Limpa os e-mails de um destinatário criado pelo próprio teste (sem `deleteMany` global). */
export function limparEmails(destinatario: string) {
  return prisma.eventoEmail.deleteMany({ where: { destinatario } })
}
