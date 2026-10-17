import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Cria um usuário interno (equipe WashAway, i17-interno-exclusao). É o único
// caminho fora de seed/demo: não existe rota de cadastro de interno.
//
// Uso:
//   npm run interno:criar -- --email ana@washaway.dev --permissoes admin [--nome "Ana"] [--senha "..."]
//
// - --permissoes: lista separada por vírgula (hoje só `admin` tem uso).
// - sem --senha: gera uma senha aleatória e mostra UMA vez no terminal.
// - e-mail já cadastrado: recusa (não altera o existente).

const CUSTO_BCRYPT = 10
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function falhar(mensagem: string): never {
  console.error(`Erro: ${mensagem}`)
  console.error('Uso: npm run interno:criar -- --email <email> --permissoes admin[,outra] [--nome <nome>] [--senha <senha>]')
  process.exit(1)
}

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    permissoes: { type: 'string' },
    nome: { type: 'string' },
    senha: { type: 'string' },
  },
})

const email = values.email?.trim().toLowerCase()
if (!email || !FORMATO_EMAIL.test(email)) falhar('informe um --email válido')

const permissoes = (values.permissoes ?? '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean)
if (permissoes.length === 0) falhar('informe --permissoes (ex.: admin)')

const senhaGerada = values.senha === undefined
const senha = values.senha ?? randomBytes(12).toString('base64url')
if (senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) falhar('a senha precisa ter de 8 a 72 bytes')

const nome = values.nome?.trim() || email.split('@')[0]

const prisma = new PrismaClient()

async function main() {
  if (await prisma.usuarioInterno.findUnique({ where: { email } })) {
    falhar(`já existe um usuário interno com o e-mail ${email}`)
  }
  const interno = await prisma.usuarioInterno.create({
    data: { nome, email: email!, senha: await bcrypt.hash(senha, CUSTO_BCRYPT), permissoes },
  })
  console.log(`+ Usuário interno ${interno.email} (${interno.nome}), permissões: ${interno.permissoes.join(', ')}`)
  if (senhaGerada) console.log(`  Senha gerada (anote agora, não será mostrada de novo): ${senha}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
