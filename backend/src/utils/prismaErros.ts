import { Prisma } from '@prisma/client'

/** `P2002`: violação de índice único (e-mail, CNPJ, placa… já cadastrados). */
export function isViolacaoDeUnicidade(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
