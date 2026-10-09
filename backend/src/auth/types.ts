// Tipos de autenticação compartilhados (I2): cliente do app, lava-rápido do
// painel (I17) e usuário interno (i17-interno). Ver "Autenticação" em
// .specs/backend.specs.md.

export const TIPOS_USUARIO = ['cliente', 'lavaRapido', 'interno'] as const

export type TipoUsuario = (typeof TIPOS_USUARIO)[number]

/** Quem está chamando — preenchido em `req.auth` pelo middleware `autenticar`. */
export interface Autenticacao {
  id: string
  tipo: TipoUsuario
  /** Só para `interno` (ex.: `['admin']`); vazio nos outros tipos. */
  permissoes: string[]
  /** Token de uso restrito (ex.: `'trocar-senha'`, i17-senha-gerada). Ausente no token normal. */
  escopo?: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: Autenticacao
    }
  }
}
