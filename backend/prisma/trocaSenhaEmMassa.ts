import 'dotenv/config'
import { prisma } from '../src/config/prisma.js'
import { trocarSenhasPadraoAdmin } from '../src/modules/lava-rapidos/senhas.service.js'

// Evento de troca de senha em massa (i17-senha-gerada) — rodar UMA vez no banco
// de dev depois do deploy do I17: toda empresa que ainda entra com a senha
// "admin" (criadas antes do I17) tem a senha invalidada, ganha uma senha
// temporária e recebe o e-mail (outbox; o worker grava em `.emails/` no dev).
// Empresa sem e-mail recebe em `cnpj-<cnpj>@washaway.dev` (endereço fictício,
// só dev — não é gravado em `LavaRapido.email`).
// Não apaga nada; só mexe nas colunas de senha. Idempotente: rodar de novo não
// mexe em quem já não tem "admin".
// Uso: npm run senhas:troca-em-massa

async function main() {
  const trocadas = await trocarSenhasPadraoAdmin()
  for (const { cnpj, destinatario } of trocadas) {
    console.log(`~ ${cnpj}: senha "admin" invalidada; senha temporária enviada para ${destinatario}`)
  }
  console.log(`Troca em massa: ${trocadas.length} empresa(s) com a senha "admin" trocada(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
