import { prisma } from '../../config/prisma.js'

export function listItensServicoAtivos() {
  return prisma.itemServico.findMany({
    where: { ativo: true },
    orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
  })
}
