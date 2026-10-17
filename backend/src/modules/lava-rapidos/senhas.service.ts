import { randomBytes, randomInt } from 'node:crypto'
import type { Prisma, TipoEventoEmail } from '@prisma/client'
import { conferirSenha, gerarHashSenha } from '../../auth/senha.js'
import { prisma } from '../../config/prisma.js'
import { enfileirarEmail } from '../email/email.service.js'

// Senha gerada (i17-senha-gerada): senha temporária enviada por e-mail, gravada
// como hash em `LavaRapido.senhaGerada`. Entrar com ela dá um token de escopo
// `trocar-senha` (só serve pra definir a senha nova); entrar com a senha
// própria a zera. Usada no aceite do onboarding, no "esqueci minha senha" e na
// troca em massa (script `prisma/trocaSenhaEmMassa.ts`).

/** Escopo do token emitido no login com a senha gerada. */
export const ESCOPO_TROCAR_SENHA = 'trocar-senha'
/** Validade do token de troca (curta: ele só serve pra trocar a senha). */
export const VALIDADE_TOKEN_TROCAR_SENHA = '15m'

export const TAMANHO_SENHA_TEMPORARIA = 10
// Sem caracteres ambíguos (0/O/o, 1/l/I).
const ALFABETO_SENHA_TEMPORARIA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/** 10 caracteres aleatórios (`crypto.randomInt`), sem caracteres ambíguos. */
export function gerarSenhaTemporaria(): string {
  return Array.from(
    { length: TAMANHO_SENHA_TEMPORARIA },
    () => ALFABETO_SENHA_TEMPORARIA[randomInt(ALFABETO_SENHA_TEMPORARIA.length)],
  ).join('')
}

export type MotivoSenhaGerada = 'onboarding' | 'esqueci_senha' | 'troca_em_massa'

const EMAIL_POR_MOTIVO: Record<MotivoSenhaGerada, { tipo: TipoEventoEmail; assunto: string; introducao: string }> = {
  onboarding: {
    tipo: 'senha_gerada',
    assunto: 'Wash Your Way — seu acesso ao painel',
    introducao:
      'Seu cadastro no Wash Your Way foi concluído. Você já pode entrar no painel com a senha que escolheu no cadastro. ' +
      'Se preferir, use a senha temporária abaixo: ao entrar com ela, o painel pede para você definir uma senha nova.',
  },
  esqueci_senha: {
    tipo: 'esqueci_senha',
    assunto: 'Wash Your Way — senha temporária',
    introducao:
      'Recebemos um pedido de recuperação de senha do painel. Entre com a senha temporária abaixo e defina uma senha nova. ' +
      'Se não foi você, ignore este e-mail: a sua senha atual continua valendo.',
  },
  troca_em_massa: {
    tipo: 'senha_gerada',
    assunto: 'Wash Your Way — defina uma nova senha',
    introducao:
      'Por segurança, a senha de acesso ao painel da sua empresa foi trocada. Entre com a senha temporária abaixo e defina uma senha nova.',
  },
}

/** Empresas antigas sem e-mail (só dev): destinatário fictício documentado. */
export function emailFicticioDeDev(cnpj: string): string {
  return `cnpj-${cnpj}@washaway.dev`
}

type EmpresaParaSenha = { id: string; name: string; cnpj: string; email: string | null }

export interface OpcoesSenhaGerada {
  /** Destinatário do e-mail; padrão: o e-mail da empresa. */
  destinatario?: string
  /** Troca também a `senha` por um hash aleatório (ninguém conhece) — troca em massa. */
  invalidarSenhaAtual?: boolean
}

/**
 * Gera uma senha temporária nova (substitui a anterior), grava o hash e
 * enfileira o e-mail com ela — tudo na transação `tx`. A senha em texto puro só
 * existe no corpo do e-mail (o worker mascara depois de enviar).
 */
export async function definirSenhaGerada(
  tx: Prisma.TransactionClient,
  empresa: EmpresaParaSenha,
  motivo: MotivoSenhaGerada,
  { destinatario = empresa.email ?? undefined, invalidarSenhaAtual = false }: OpcoesSenhaGerada = {},
): Promise<void> {
  if (!destinatario) throw new Error(`Lava-rápido ${empresa.id} sem e-mail para enviar a senha gerada`)

  const senhaTemporaria = gerarSenhaTemporaria()
  await tx.lavaRapido.update({
    where: { id: empresa.id },
    data: {
      senhaGerada: await gerarHashSenha(senhaTemporaria),
      ...(invalidarSenhaAtual ? { senha: await gerarHashSenha(randomBytes(32).toString('hex')) } : {}),
    },
  })

  const { tipo, assunto, introducao } = EMAIL_POR_MOTIVO[motivo]
  await enfileirarEmail(tx, {
    tipo,
    destinatario,
    assunto,
    corpo: [
      `Olá, ${empresa.name}.`,
      '',
      introducao,
      '',
      `CNPJ: ${empresa.cnpj}`,
      `Senha temporária: ${senhaTemporaria}`,
      '',
      'Equipe Wash Your Way',
    ].join('\n'),
  })
}

/** Hashes de senha da empresa (só para conferência no servidor; nunca sai da API). */
export function getSenhasDoLavaRapido(id: string) {
  return prisma.lavaRapido.findUnique({ where: { id }, select: { id: true, senha: true, senhaGerada: true } })
}

/** Grava a senha nova (hash) e zera a senha gerada. */
export async function trocarSenha(lavaRapidoId: string, novaSenha: string): Promise<void> {
  await prisma.lavaRapido.update({
    where: { id: lavaRapidoId },
    data: { senha: await gerarHashSenha(novaSenha), senhaGerada: null },
  })
}

/**
 * "Esqueci minha senha": se houver empresa com o e-mail (já normalizado), gera
 * uma senha temporária nova e enfileira o e-mail. Sem empresa, não faz nada —
 * mas gasta um hash, pra resposta levar mais ou menos o mesmo tempo.
 */
export async function esqueciSenha(email: string): Promise<void> {
  const empresa = await prisma.lavaRapido.findUnique({
    where: { email },
    select: { id: true, name: true, cnpj: true, email: true },
  })
  if (!empresa) {
    await gerarHashSenha(gerarSenhaTemporaria())
    return
  }
  await prisma.$transaction((tx) => definirSenhaGerada(tx, empresa, 'esqueci_senha'))
}

export interface ResultadoSenhaEmMassa {
  id: string
  cnpj: string
  destinatario: string
}

/**
 * Troca em massa: gera senha temporária (e e-mail) para cada empresa do
 * `filtro`, uma transação por empresa. Empresa sem e-mail (anterior ao I17)
 * recebe no endereço fictício de dev. Nesta sprint só o script
 * `prisma/trocaSenhaEmMassa.ts` chama (disparo pela interface fica pra depois).
 */
export async function gerarSenhasEmMassa(
  filtro: Prisma.LavaRapidoWhereInput,
  { invalidarSenhaAtual = false }: Pick<OpcoesSenhaGerada, 'invalidarSenhaAtual'> = {},
): Promise<ResultadoSenhaEmMassa[]> {
  const empresas = await prisma.lavaRapido.findMany({
    where: filtro,
    select: { id: true, name: true, cnpj: true, email: true },
    orderBy: { cnpj: 'asc' },
  })

  const resultado: ResultadoSenhaEmMassa[] = []
  for (const empresa of empresas) {
    const destinatario = empresa.email ?? emailFicticioDeDev(empresa.cnpj)
    await prisma.$transaction((tx) =>
      definirSenhaGerada(tx, empresa, 'troca_em_massa', { destinatario, invalidarSenhaAtual }),
    )
    resultado.push({ id: empresa.id, cnpj: empresa.cnpj, destinatario })
  }
  return resultado
}

/** Senha fixa das empresas criadas antes do I17 (só existia em dev). */
export const SENHA_ANTIGA_PADRAO = 'admin'

/**
 * Evento de troca em massa das empresas que ainda entram com a senha "admin"
 * (script `npm run senhas:troca-em-massa`): invalida a senha (hash aleatório),
 * gera a senha temporária e enfileira o e-mail. Idempotente — quem já não tem
 * "admin" fica de fora. Só mexe nas colunas de senha; não apaga nada.
 * `filtro` restringe o universo (os testes passam só as empresas deles).
 */
export async function trocarSenhasPadraoAdmin(filtro: Prisma.LavaRapidoWhereInput = {}) {
  const candidatas = await prisma.lavaRapido.findMany({ where: filtro, select: { id: true, senha: true } })
  const comSenhaAdmin: string[] = []
  for (const { id, senha } of candidatas) {
    if (await conferirSenha(SENHA_ANTIGA_PADRAO, senha)) comSenhaAdmin.push(id)
  }
  if (comSenhaAdmin.length === 0) return []
  return gerarSenhasEmMassa({ id: { in: comSenhaAdmin } }, { invalidarSenhaAtual: true })
}
