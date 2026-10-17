/**
 * POST com corpo JSON (rotas públicas do login/onboarding e a troca de senha).
 * @param {string} url
 * @param {unknown} body
 * @param {{ token?: string }} [opcoes] token Bearer opcional
 * @returns {Promise<{ response: Response, data: any }>} `data` é `null` se a resposta não for JSON
 */
export async function postJson(url, body, { token } = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  return { response, data }
}
