const EMPRESA_LOGADA_KEY = 'washaway:empresaLogadaId'
// Token de lava-rápido (I17), enviado como `Authorization: Bearer` pelo httpClient.
const TOKEN_KEY = 'washaway:token'
const SOLICITACAO_ONBOARDING_KEY = 'washaway:solicitacaoOnboardingId'

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

/**
 * @returns {string | null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * @param {string} token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function limparSessao() {
  localStorage.removeItem(EMPRESA_LOGADA_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * @returns {string | null}
 */
export function getSolicitacaoOnboardingId() {
  return localStorage.getItem(SOLICITACAO_ONBOARDING_KEY)
}

/**
 * @param {string} id
 */
export function setSolicitacaoOnboardingId(id) {
  localStorage.setItem(SOLICITACAO_ONBOARDING_KEY, id)
}

export function limparSolicitacaoOnboarding() {
  localStorage.removeItem(SOLICITACAO_ONBOARDING_KEY)
}
