import type { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Usuário interno de exemplo (i17-interno-exclusao), SÓ PARA DEV: usado pelo
// demo.ts e pelo seed.ts para operar as rotas internas pelo Swagger
// (/api-docs → POST /auth/interno/login → "Authorize").
export const INTERNO_DEMO = {
  nome: 'Equipe WashAway (dev)',
  email: 'dev@washaway.dev',
  senha: 'demo1234',
  permissoes: ['admin'],
}

/** Cria o interno de exemplo se ainda não existir (não altera um existente). Devolve true se criou. */
export async function garantirInternoDemo(prisma: PrismaClient): Promise<boolean> {
  const existente = await prisma.usuarioInterno.findUnique({ where: { email: INTERNO_DEMO.email } })
  if (existente) return false
  await prisma.usuarioInterno.create({
    data: {
      nome: INTERNO_DEMO.nome,
      email: INTERNO_DEMO.email,
      senha: await bcrypt.hash(INTERNO_DEMO.senha, 10),
      permissoes: INTERNO_DEMO.permissoes,
    },
  })
  return true
}
