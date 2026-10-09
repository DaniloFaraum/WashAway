import jwt from 'jsonwebtoken'
import { TIPOS_USUARIO, type Autenticacao, type TipoUsuario } from './types.js'

// Token de acesso (JWT HS256) compartilhado por cliente, lava-rápido e interno.
// Payload: { sub: <id>, tipo, permissoes?, escopo? } — ver "Autenticação" em
// .specs/backend.specs.md. O segredo vem só de variável de ambiente.

const ALGORITMO = 'HS256'
const VALIDADE_PADRAO = '7d'

/** Segredo do token. Lança se `JWT_SECRET` não estiver definido. */
function segredo(): string {
  const valor = process.env.JWT_SECRET
  if (!valor) {
    throw new Error('JWT_SECRET não definido — configure no .env (ver .env.example)')
  }
  return valor
}

// HS256 com segredo curto pode ser quebrado por força bruta offline a partir
// de qualquer token emitido (e aí dá pra forjar token de qualquer tipo).
export const TAMANHO_MINIMO_SEGREDO = 32

/**
 * Chamado na subida do servidor: falha cedo se o segredo do token faltar ou
 * for curto demais, ou se `JWT_EXPIRES_IN` não for um valor aceito pelo
 * jsonwebtoken (senão só estouraria no primeiro login, como 500).
 */
export function garantirConfiguracaoDoToken(): void {
  if (segredo().length < TAMANHO_MINIMO_SEGREDO) {
    throw new Error(`JWT_SECRET curto demais — use pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres aleatórios (ver .env.example)`)
  }
  try {
    assinarToken({ id: 'verificacao-de-configuracao', tipo: 'cliente' })
  } catch (error) {
    throw new Error(`JWT_EXPIRES_IN inválido ("${validade()}") — use o formato do jsonwebtoken, ex.: 7d, 12h, 3600`, {
      cause: error,
    })
  }
}

function validade(): string {
  return process.env.JWT_EXPIRES_IN || VALIDADE_PADRAO
}

export interface DadosToken {
  id: string
  tipo: TipoUsuario
  permissoes?: string[]
  escopo?: string
}

/** Assina um token de acesso para `id`/`tipo`, com validade `JWT_EXPIRES_IN` (padrão 7d). */
export function assinarToken({ id, tipo, permissoes, escopo }: DadosToken): string {
  const payload: Record<string, unknown> = { tipo }
  if (permissoes && permissoes.length > 0) payload.permissoes = permissoes
  if (escopo) payload.escopo = escopo
  return jwt.sign(payload, segredo(), {
    algorithm: ALGORITMO,
    subject: id,
    expiresIn: validade() as jwt.SignOptions['expiresIn'],
  })
}

function ehTipoUsuario(valor: unknown): valor is TipoUsuario {
  return typeof valor === 'string' && (TIPOS_USUARIO as readonly string[]).includes(valor)
}

/**
 * Verifica assinatura, validade e formato do token. Devolve quem é
 * (`{ id, tipo, permissoes, escopo? }`) ou lança erro (inválido, expirado,
 * assinado com outro segredo ou payload fora do contrato).
 */
export function verificarToken(token: string): Autenticacao {
  const payload = jwt.verify(token, segredo(), { algorithms: [ALGORITMO] })
  if (typeof payload === 'string') throw new Error('Payload de token inválido')

  const { sub, tipo, permissoes, escopo, exp } = payload as jwt.JwtPayload & Record<string, unknown>
  // `jwt.verify` só confere a validade quando há `exp`; todo token emitido por
  // `assinarToken` tem, então um token sem `exp` (que seria eterno) é recusado.
  if (typeof exp !== 'number' || typeof sub !== 'string' || sub === '' || !ehTipoUsuario(tipo)) {
    throw new Error('Payload de token inválido')
  }
  if (permissoes !== undefined && !(Array.isArray(permissoes) && permissoes.every((p) => typeof p === 'string'))) {
    throw new Error('Payload de token inválido')
  }
  if (escopo !== undefined && typeof escopo !== 'string') throw new Error('Payload de token inválido')

  return {
    id: sub,
    tipo,
    permissoes: (permissoes as string[] | undefined) ?? [],
    ...(escopo ? { escopo } : {}),
  }
}

/** Data de expiração (ISO) de um token assinado por `assinarToken`. */
export function expiracaoDoToken(token: string): string {
  const decodificado = jwt.decode(token)
  if (!decodificado || typeof decodificado === 'string' || typeof decodificado.exp !== 'number') {
    throw new Error('Token sem expiração')
  }
  return new Date(decodificado.exp * 1000).toISOString()
}
