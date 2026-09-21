/**
 * @param {string} baseUrl
 * @returns {{ request: (path: string, options?: RequestInit) => Promise<any> }}
 */
export function createHttpClient(baseUrl) {
  async function request(path, options) {
    const response = await fetch(`${baseUrl}${path}`, options)
    if (!response.ok) {
      throw new Error(`Falha na requisição ${path}: ${response.status}`)
    }
    return response.json()
  }

  return { request }
}
