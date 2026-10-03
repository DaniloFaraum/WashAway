import { prisma } from '../../config/prisma.js'

// Se por algum motivo houver mais de um marcado como vigente, vale a maior versão.
export function getContratoVigente() {
  return prisma.contrato.findFirst({
    where: { vigente: true },
    orderBy: { versao: 'desc' },
  })
}
