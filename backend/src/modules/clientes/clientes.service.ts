import bcrypt from 'bcryptjs'
import { prisma } from '../../config/prisma.js'
import { normalizarEmail, type DadosCadastroCliente } from './clientes.validation.js'

const CUSTO_BCRYPT = 10

// Hash qualquer, só pra o login com e-mail inexistente gastar o mesmo tempo de
// um `bcrypt.compare` real (não dá pra descobrir quais e-mails existem pelo tempo).
const HASH_FICTICIO = bcrypt.hashSync('senha-ficticia-para-tempo-constante', CUSTO_BCRYPT)

export function omitSenhaCliente<T extends { senha: string }>(cliente: T): Omit<T, 'senha'> {
  const { senha: _senha, ...resto } = cliente
  return resto
}

/** Cria o cliente com a senha em hash bcrypt. Normaliza o e-mail de novo (defesa para quem chama sem passar pela validação). */
export async function criarCliente({ nome, email, senha }: DadosCadastroCliente) {
  return prisma.cliente.create({
    data: { nome, email: normalizarEmail(email), senha: await bcrypt.hash(senha, CUSTO_BCRYPT) },
  })
}

/** Busca por e-mail, normalizando antes (sem diferenciar maiúsculas). */
export function getClienteByEmail(email: string) {
  return prisma.cliente.findUnique({ where: { email: normalizarEmail(email) } })
}

export function getClienteById(id: string) {
  return prisma.cliente.findUnique({ where: { id } })
}

/** Cliente dono das credenciais, ou `null` (e-mail inexistente ou senha errada — sem distinguir). */
export async function autenticarCliente(email: string, senha: string) {
  const cliente = await getClienteByEmail(email)
  const senhaConfere = await bcrypt.compare(senha, cliente?.senha ?? HASH_FICTICIO)
  return cliente && senhaConfere ? cliente : null
}
