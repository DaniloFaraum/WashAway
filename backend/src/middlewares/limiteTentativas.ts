import type { Request } from 'express'
import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit'

// Limite de tentativas (I17, decisão de 2026-10-10) para login do cliente,
// login do lava-rápido e cadastro do cliente. Estourado o limite → 429
// `{ error }` com mensagem amigável (app e painel mostram a mensagem).
//
// - Chave = IP + identificador do login (e-mail ou CNPJ normalizado) quando o
//   body traz um; sem identificador, só o IP.
// - Contagem em memória (express-rate-limit): vale só dentro de UMA instância
//   do backend — com várias instâncias, cada uma conta separado.
// - Configurável por env: LIMITE_TENTATIVAS (padrão 10) por janela de
//   LIMITE_TENTATIVAS_JANELA_MINUTOS (padrão 15). Ver .env.example.

export const LIMITE_TENTATIVAS_PADRAO = 10
export const JANELA_MINUTOS_PADRAO = 15

export interface ConfigLimiteTentativas {
  /** Máximo de tentativas por chave dentro da janela. */
  limite: number
  /** Duração da janela em minutos. */
  janelaMinutos: number
}

function inteiroPositivo(valor: string | undefined, padrao: number): number {
  const numero = Number(valor)
  return Number.isInteger(numero) && numero > 0 ? numero : padrao
}

/** Configuração lida das variáveis de ambiente (com os padrões acima). */
export function configLimiteTentativasDoAmbiente(): ConfigLimiteTentativas {
  return {
    limite: inteiroPositivo(process.env.LIMITE_TENTATIVAS, LIMITE_TENTATIVAS_PADRAO),
    janelaMinutos: inteiroPositivo(process.env.LIMITE_TENTATIVAS_JANELA_MINUTOS, JANELA_MINUTOS_PADRAO),
  }
}

/** E-mail (trim + minúsculas) ou CNPJ (só dígitos) do body, se houver. */
function identificadorDoLogin(req: Request): string {
  const { email, cnpj } = (req.body ?? {}) as Record<string, unknown>
  if (typeof email === 'string' && email.trim() !== '') return `email:${email.trim().toLowerCase()}`
  if (typeof cnpj === 'string' && cnpj.trim() !== '') return `cnpj:${cnpj.replace(/\D/g, '')}`
  return ''
}

export interface OpcoesLimiteTentativas {
  /**
   * `true` = só tentativas que falharam (status ≥ 400) contam — usado nos
   * logins, para quem acerta a senha não ser bloqueado. Padrão: tudo conta
   * (cadastro).
   */
  soFalhasContam?: boolean
}

/**
 * Cria um limitador com contador próprio. Cada rota ganha o seu (contadores
 * separados entre login do cliente, login do lava-rápido e cadastro).
 */
export function limiteTentativas(
  config: ConfigLimiteTentativas,
  { soFalhasContam = false }: OpcoesLimiteTentativas = {},
): RateLimitRequestHandler {
  const mensagem = `Muitas tentativas. Aguarde ${config.janelaMinutos} minutos e tente de novo.`

  return rateLimit({
    windowMs: config.janelaMinutos * 60 * 1000,
    limit: config.limite,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: soFalhasContam,
    keyGenerator: (req) => `${req.ip ?? ''}|${identificadorDoLogin(req)}`,
    handler: (_req, res) => {
      res.status(429).json({ error: mensagem })
    },
  })
}
