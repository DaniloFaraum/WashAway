import { prisma } from '../../config/prisma.js'

// Limpeza por id: cada arquivo de teste apaga só o que ele criou, sem
// `deleteMany` global (que apagaria dados de outro arquivo rodando no mesmo
// banco). As factories registram sozinhas o que criam; registros criados via
// API no teste (ex.: POST /intercorrencias) podem ser registrados com
// `registrarParaLimpeza` — ou ficam por conta do cascade do lava-rápido.
//
// O estado é por arquivo de teste (o Vitest isola os módulos por arquivo).
//
// Uso:
//   afterAll(async () => {
//     await limparDadosDeTeste()
//     await prisma.$disconnect()
//   })

// Ordem de remoção: dependentes antes de quem eles referenciam.
const ORDEM = [
  'pedido',
  'intercorrencia',
  'servico',
  'itemServico',
  'solicitacaoOnboarding',
  'lavaRapido',
  'contrato',
] as const

export type ModeloLimpavel = (typeof ORDEM)[number]

const criados = new Map<ModeloLimpavel, Set<string>>()

export function registrarParaLimpeza(modelo: ModeloLimpavel, id: string): void {
  const ids = criados.get(modelo) ?? new Set<string>()
  ids.add(id)
  criados.set(modelo, ids)
}

export async function limparDadosDeTeste(): Promise<void> {
  for (const modelo of ORDEM) {
    const ids = [...(criados.get(modelo) ?? [])]
    if (ids.length === 0) continue
    const where = { where: { id: { in: ids } } }
    switch (modelo) {
      case 'pedido':
        await prisma.pedido.deleteMany(where)
        break
      case 'intercorrencia':
        await prisma.intercorrencia.deleteMany(where)
        break
      case 'servico':
        await prisma.servico.deleteMany(where)
        break
      case 'itemServico':
        await prisma.itemServico.deleteMany(where)
        break
      case 'solicitacaoOnboarding':
        await prisma.solicitacaoOnboarding.deleteMany(where)
        break
      case 'lavaRapido':
        await prisma.lavaRapido.deleteMany(where)
        break
      case 'contrato':
        await prisma.contrato.deleteMany(where)
        break
    }
    criados.delete(modelo)
  }
}
