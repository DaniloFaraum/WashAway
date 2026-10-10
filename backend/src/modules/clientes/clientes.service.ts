import { conferirSenha, gerarHashSenha } from '../../auth/senha.js'
import { prisma } from '../../config/prisma.js'
import { normalizarEmail } from '../../utils/email.js'
import type { DadosCadastroCliente } from './clientes.validation.js'

export function omitSenhaCliente<T extends { senha: string }>(cliente: T): Omit<T, 'senha'> {
  const { senha: _senha, ...resto } = cliente
  return resto
}

/** Cria o cliente com a senha em hash bcrypt. Normaliza o e-mail de novo (defesa para quem chama sem passar pela validação). */
export async function criarCliente({ nome, email, senha }: DadosCadastroCliente) {
  return prisma.cliente.create({
    data: { nome, email: normalizarEmail(email), senha: await gerarHashSenha(senha) },
  })
}

/** Busca por e-mail, normalizando antes (sem diferenciar maiúsculas). */
export function getClienteByEmail(email: string) {
  return prisma.cliente.findUnique({ where: { email: normalizarEmail(email) } })
}

export function getClienteById(id: string) {
  return prisma.cliente.findUnique({ where: { id } })
}

/** Cliente dono das credenciais, ou `null` (e-mail inexistente ou senha errada — sem distinguir, e no mesmo tempo). */
export async function autenticarCliente(email: string, senha: string) {
  const cliente = await getClienteByEmail(email)
  return (await conferirSenha(senha, cliente?.senha)) ? cliente : null
}
