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

type PorIds = { where: { id: { in: string[] } } }
const porIds = (ids: string[]): PorIds => ({ where: { id: { in: ids } } })

// Como apagar cada modelo, na ordem de remoção (dependentes antes de quem eles
// referenciam): a ordem das chaves é a ordem do laço em `limparDadosDeTeste`.
// Modelo novo (ex.: cliente no I1, veiculo no I3) = uma linha aqui.
const REMOVEDORES = {
  pedido: (ids: string[]) => prisma.pedido.deleteMany(porIds(ids)),
  intercorrencia: (ids: string[]) => prisma.intercorrencia.deleteMany(porIds(ids)),
  servico: (ids: string[]) => prisma.servico.deleteMany(porIds(ids)),
  itemServico: (ids: string[]) => prisma.itemServico.deleteMany(porIds(ids)),
  solicitacaoOnboarding: (ids: string[]) => prisma.solicitacaoOnboarding.deleteMany(porIds(ids)),
  cliente: (ids: string[]) => prisma.cliente.deleteMany(porIds(ids)),
  lavaRapido: (ids: string[]) => prisma.lavaRapido.deleteMany(porIds(ids)),
  contrato: (ids: string[]) => prisma.contrato.deleteMany(porIds(ids)),
} satisfies Record<string, (ids: string[]) => Promise<unknown>>

export type ModeloLimpavel = keyof typeof REMOVEDORES

const criados = new Map<ModeloLimpavel, Set<string>>()

export function registrarParaLimpeza(modelo: ModeloLimpavel, id: string): void {
  const ids = criados.get(modelo) ?? new Set<string>()
  ids.add(id)
  criados.set(modelo, ids)
}

export async function limparDadosDeTeste(): Promise<void> {
  for (const modelo of Object.keys(REMOVEDORES) as ModeloLimpavel[]) {
    const ids = [...(criados.get(modelo) ?? [])]
    if (ids.length === 0) continue
    await REMOVEDORES[modelo](ids)
    criados.delete(modelo)
  }
}
