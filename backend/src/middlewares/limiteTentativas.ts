import type { Request } from 'express'
import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit'
import { normalizarEmail } from '../utils/email.js'

// Limite de tentativas (I17, decisão de 2026-10-10) para login do cliente,
// login do lava-rápido, cadastro do cliente e solicitação de onboarding. Estourado o limite → 429
// `{ error }` com mensagem amigável (app e painel mostram a mensagem).
//
// - Chave = IP + o campo do body que identifica a conta NAQUELA rota (e-mail
//   normalizado ou CNPJ só com dígitos); sem o campo, só o IP. Só o campo da
//   rota entra na chave: um campo extra qualquer no body (ex.: `email` no login
//   por CNPJ) não pode abrir um contador novo a cada tentativa.
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

// "Esqueci minha senha" do painel (i17-senha-gerada): 5 por hora por IP + e-mail.
export const LIMITE_ESQUECI_SENHA_PADRAO = 5
export const JANELA_ESQUECI_SENHA_MINUTOS_PADRAO = 60

/** Configuração do limite do "esqueci minha senha" (LIMITE_ESQUECI_SENHA, LIMITE_ESQUECI_SENHA_JANELA_MINUTOS). */
export function configLimiteEsqueciSenhaDoAmbiente(): ConfigLimiteTentativas {
  return {
    limite: inteiroPositivo(process.env.LIMITE_ESQUECI_SENHA, LIMITE_ESQUECI_SENHA_PADRAO),
    janelaMinutos: inteiroPositivo(
      process.env.LIMITE_ESQUECI_SENHA_JANELA_MINUTOS,
      JANELA_ESQUECI_SENHA_MINUTOS_PADRAO,
    ),
  }
}

/**
 * Campo do body que identifica a conta na rota. `'nenhum'` = rota autenticada
 * sem campo de conta no body (ex.: troca de senha) — a chave é só o IP.
 */
export type IdentificadorDaConta = 'email' | 'cnpj' | 'nenhum'

/** E-mail (normalizado) ou CNPJ (só dígitos) do body — só o campo da rota. */
function identificadorDaConta(req: Request, campo: IdentificadorDaConta): string {
  if (campo === 'nenhum') return ''
  const valor = ((req.body ?? {}) as Record<string, unknown>)[campo]
  if (typeof valor !== 'string' || valor.trim() === '') return ''
  return campo === 'email' ? `email:${normalizarEmail(valor)}` : `cnpj:${valor.replace(/\D/g, '')}`
}

export interface OpcoesLimiteTentativas {
  /** Campo do body que identifica a conta nesta rota (entra na chave junto com o IP). */
  identificador: IdentificadorDaConta
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
  { identificador, soFalhasContam = false }: OpcoesLimiteTentativas,
): RateLimitRequestHandler {
  const mensagem = `Muitas tentativas. Aguarde ${config.janelaMinutos} minutos e tente de novo.`

  return rateLimit({
    windowMs: config.janelaMinutos * 60 * 1000,
    limit: config.limite,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: soFalhasContam,
    keyGenerator: (req) => `${req.ip ?? ''}|${identificadorDaConta(req, identificador)}`,
    handler: (_req, res) => {
      res.status(429).json({ error: mensagem })
    },
  })
}
