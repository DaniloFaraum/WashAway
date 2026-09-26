const VIACEP_BASE_URL = 'https://viacep.com.br/ws'

/**
 * @typedef {Object} EnderecoPorCep
 * @property {string} logradouro
 * @property {string} bairro
 * @property {string} cidade
 * @property {string} estado
 */

/**
 * @param {string} cep só dígitos, 8 caracteres
 * @param {string} [baseUrl] usado nos testes para apontar a um backend de teste isolado
 * @returns {Promise<EnderecoPorCep | null>} null se o CEP não existir ou a busca falhar
 */
export async function buscarCep(cep, baseUrl = VIACEP_BASE_URL) {
  try {
    const response = await fetch(`${baseUrl}/${cep}/json/`)
    if (!response.ok) return null

    const data = await response.json()
    if (data.erro) return null

    return {
      logradouro: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.localidade ?? '',
      estado: data.uf ?? '',
    }
  } catch {
    return null
  }
}
