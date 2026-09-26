// Só formato básico (14 dígitos numéricos) — sem validação de dígito
// verificador nesta task (ver docs/plan/selecao-empresa-admin-front, "Fora do escopo").
export function isValidCnpj(cnpj: unknown): cnpj is string {
  return typeof cnpj === 'string' && /^\d{14}$/.test(cnpj)
}
