import { Prisma } from '@prisma/client'

/** `P2002`: violação de índice único (e-mail, CNPJ, placa… já cadastrados). */
export function isViolacaoDeUnicidade(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

/** `P2003`: violação de chave estrangeira (ex.: apagar veículo que já tem pedido — I13). */
export function isViolacaoDeChaveEstrangeira(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'
}
