import { describe, expect, it } from 'vitest'
import supertest from 'supertest'
import { createApp } from '../app.js'

const app = createApp()

describe('/api-docs', () => {
  it('GET /api-docs serve a UI do Swagger', async () => {
    const response = await supertest(app).get('/api-docs/')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
  })

  it('GET /api-docs.json devolve o documento OpenAPI cru', async () => {
    const response = await supertest(app).get('/api-docs.json')

    expect(response.status).toBe(200)
    expect(response.body.openapi).toBe('3.0.3')
    expect(response.body.paths).toHaveProperty('/lavaRapidos')
    expect(response.body.paths).toHaveProperty('/intercorrencias/{id}')
  })
})
