import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '../config/prisma.js'
import { enfileirarEmail } from '../modules/email/email.service.js'
import { emailsEnfileirados, limparEmails } from './helpers/email.js'

const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const destinatarioCommit = `commit-${sufixo}@teste.washaway`
const destinatarioRollback = `rollback-${sufixo}@teste.washaway`

class RollbackProposital extends Error {}

describe('enfileirarEmail (outbox de e-mail)', () => {
  afterAll(async () => {
    await limparEmails(destinatarioCommit)
    await limparEmails(destinatarioRollback)
    await prisma.$disconnect()
  })

  it('com commit, deixa o evento pendente na tabela', async () => {
    await prisma.$transaction((tx) =>
      enfileirarEmail(tx, {
        tipo: 'teste',
        destinatario: destinatarioCommit,
        assunto: 'Assunto de teste',
        corpo: 'Sua senha é 123456',
      }),
    )

    const emails = await emailsEnfileirados(destinatarioCommit)
    expect(emails).toHaveLength(1)
    expect(emails[0]).toMatchObject({
      tipo: 'teste',
      assunto: 'Assunto de teste',
      corpo: 'Sua senha é 123456',
      status: 'pendente',
      tentativas: 0,
      ultimoErro: null,
      enviadoEm: null,
    })
  })

  it('com rollback da transação da ação, não deixa evento', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await enfileirarEmail(tx, {
          tipo: 'teste',
          destinatario: destinatarioRollback,
          assunto: 'Não deveria existir',
          corpo: 'corpo',
        })
        throw new RollbackProposital('a ação falhou depois de enfileirar')
      }),
    ).rejects.toBeInstanceOf(RollbackProposital)

    expect(await emailsEnfileirados(destinatarioRollback)).toHaveLength(0)
  })
})
