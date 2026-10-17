import { isIsoComFusoValido } from '../pedidos/pedidos.validation.js'

// Só formato básico (14 dígitos numéricos) — sem validação de dígito
// verificador nesta task (ver docs/plan/selecao-empresa-admin-front, "Fora do escopo").
export function isValidCnpj(cnpj: unknown): cnpj is string {
  return typeof cnpj === 'string' && /^\d{14}$/.test(cnpj)
}

// ---------------------------------------------------------------------------
// Busca por horário (I9, `GET /lavaRapidos?horario=`)
// ---------------------------------------------------------------------------

/** Até quantos dias à frente a busca aceita (o app oferece hoje + 29). */
export const DIAS_MAX_BUSCA_HORARIO = 30
/** Folga para o relógio do aparelho/latência: até 1 min no passado ainda vale. */
export const TOLERANCIA_PASSADO_MS = 60 * 1000

/**
 * `?horario=` da listagem: ISO 8601 com fuso (mesma regra do `POST /pedidos`),
 * não no passado (tolerância de 1 min) e no máximo 30 dias à frente.
 */
export function validarHorarioBusca(texto: string, agora: Date): { erro: string } | { horario: Date } {
  if (!isIsoComFusoValido(texto)) {
    return { erro: 'horario inválido — use ISO 8601 com fuso (ex.: 2026-10-20T10:00:00-03:00)' }
  }
  const horario = new Date(texto)
  if (horario.getTime() < agora.getTime() - TOLERANCIA_PASSADO_MS) {
    return { erro: 'horario no passado' }
  }
  if (horario.getTime() > agora.getTime() + DIAS_MAX_BUSCA_HORARIO * 24 * 60 * 60 * 1000) {
    return { erro: `horario além de ${DIAS_MAX_BUSCA_HORARIO} dias à frente` }
  }
  return { horario }
}
