import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { parseArgs } from 'node:util'
import { prisma } from '../src/config/prisma.js'
import { criarUsuarioInterno } from '../src/modules/internos/internos.service.js'
import { FORMATO_EMAIL, normalizarEmail } from '../src/utils/email.js'

// Cria um usuário interno (equipe WashAway, i17-interno-exclusao). É o único
// caminho fora de seed/demo: não existe rota de cadastro de interno.
//
// Uso:
//   npm run interno:criar -- --email ana@washaway.dev --permissoes admin [--nome "Ana"] [--senha "..."]
//
// - --permissoes: lista separada por vírgula (hoje só `admin` tem uso).
// - sem --senha: gera uma senha aleatória e mostra UMA vez no terminal.
// - e-mail já cadastrado: recusa (não altera o existente).
// Hash e normalização do e-mail são os de `src/` (criarUsuarioInterno), os
// mesmos do login.

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

const email = values.email === undefined ? undefined : normalizarEmail(values.email)
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

async function main() {
  if (await prisma.usuarioInterno.findUnique({ where: { email } })) {
    falhar(`já existe um usuário interno com o e-mail ${email}`)
  }
  const interno = await criarUsuarioInterno({ nome, email: email!, senha, permissoes })
  console.log(`+ Usuário interno ${interno.email} (${interno.nome}), permissões: ${interno.permissoes.join(', ')}`)
  if (senhaGerada) console.log(`  Senha gerada (anote agora, não será mostrada de novo): ${senha}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
