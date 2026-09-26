const EMPRESA_LOGADA_KEY = 'washaway:empresaLogadaId'

/**
 * @returns {string | null}
 */
export function getEmpresaLogadaId() {
  return localStorage.getItem(EMPRESA_LOGADA_KEY)
}

/**
 * @param {string} id
 */
export function setEmpresaLogadaId(id) {
  localStorage.setItem(EMPRESA_LOGADA_KEY, id)
}

export function limparSessao() {
  localStorage.removeItem(EMPRESA_LOGADA_KEY)
}
