import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { criarHorariosSeNaoTiver } from './horariosExemplo.js'

// Script de dados do I19: dá o horário de exemplo (seg–sex 08:00–18:00, sáb
// 08:00–12:00, dom fechado) a todo lava-rápido que ainda não tem nenhum.
// Só insere — não altera nem apaga horário existente, nem outro dado. Idempotente.
// Uso: npx tsx prisma/horarios-exemplo.ts   (rode o demo.ts antes, se quiser as variações dele)

const prisma = new PrismaClient()

async function main() {
  const lavaRapidos = await prisma.lavaRapido.findMany({ select: { id: true, name: true } })
  let criados = 0
  for (const lavaRapido of lavaRapidos) {
    if (await criarHorariosSeNaoTiver(prisma, lavaRapido.id)) {
      criados += 1
      console.log(`+ ${lavaRapido.name}: horário padrão`)
    }
  }
  console.log(`Horários de exemplo: ${criados} lava-rápido(s) receberam horário; ${lavaRapidos.length - criados} já tinham.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
