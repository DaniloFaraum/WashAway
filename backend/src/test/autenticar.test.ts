import { describe, expect, it } from 'vitest'
import express from 'express'
import jwt from 'jsonwebtoken'
import supertest from 'supertest'
import { assinarToken } from '../auth/token.js'
import { autenticar } from '../middlewares/autenticar.js'
import { comToken } from './helpers/auth.js'

// Contrato do middleware `autenticar(...tipos)` (I2), do qual o I17 depende:
// 401 = não autenticado (sem token, inválido, expirado); 403 = autenticado,
// mas de outro tipo ou com token de uso restrito (escopo).
// App mínimo só com o middleware, sem banco.

function appCom(...tipos: Parameters<typeof autenticar>) {
  const app = express()
  app.get('/protegida', autenticar(...tipos), (req, res) => {
    res.json(req.auth)
  })
  return app
}

const rotaDeCliente = appCom('cliente')
const rotaDeLavaRapido = appCom('lavaRapido')

describe('autenticar(...tipos)', () => {
  it('sem header Authorization: 401', async () => {
    const response = await supertest(rotaDeCliente).get('/protegida')

    expect(response.status).toBe(401)
  })

  it('header sem o esquema Bearer: 401', async () => {
    const token = assinarToken({ id: 'c1', tipo: 'cliente' })

    const response = await supertest(rotaDeCliente).get('/protegida').set('Authorization', `Basic ${token}`)

    expect(response.status).toBe(401)
  })

  it('token expirado: 401', async () => {
    const expirado = jwt.sign({ tipo: 'cliente' }, process.env.JWT_SECRET!, { subject: 'c1', expiresIn: -10 })

    const response = await comToken(supertest(rotaDeCliente).get('/protegida'), expirado)

    expect(response.status).toBe(401)
  })

  it('token com tipo fora do contrato: 401', async () => {
    const estranho = jwt.sign({ tipo: 'admin' }, process.env.JWT_SECRET!, { subject: 'c1', expiresIn: '1h' })

    const response = await comToken(supertest(rotaDeCliente).get('/protegida'), estranho)

    expect(response.status).toBe(401)
  })

  it('token de lava-rápido em rota de cliente: 403', async () => {
    const token = assinarToken({ id: 'lr1', tipo: 'lavaRapido' })

    const response = await comToken(supertest(rotaDeCliente).get('/protegida'), token)

    expect(response.status).toBe(403)
  })

  it('token de cliente em rota de lava-rápido: 403', async () => {
    const token = assinarToken({ id: 'c1', tipo: 'cliente' })

    const response = await comToken(supertest(rotaDeLavaRapido).get('/protegida'), token)

    expect(response.status).toBe(403)
  })

  it('token com escopo restrito (ex.: trocar-senha): 403', async () => {
    const token = assinarToken({ id: 'lr1', tipo: 'lavaRapido', escopo: 'trocar-senha' })

    const response = await comToken(supertest(rotaDeLavaRapido).get('/protegida'), token)

    expect(response.status).toBe(403)
  })

  it('token válido do tipo aceito: preenche req.auth = { id, tipo, permissoes }', async () => {
    const token = assinarToken({ id: 'c1', tipo: 'cliente' })

    const response = await comToken(supertest(rotaDeCliente).get('/protegida'), token)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: 'c1', tipo: 'cliente', permissoes: [] })
  })

  it('aceita mais de um tipo: autenticar("lavaRapido", "interno")', async () => {
    const app = appCom('lavaRapido', 'interno')
    const token = assinarToken({ id: 'i1', tipo: 'interno', permissoes: ['admin'] })

    const response = await comToken(supertest(app).get('/protegida'), token)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ id: 'i1', tipo: 'interno', permissoes: ['admin'] })
  })

  it('sem nenhum tipo: falha na montagem da rota', () => {
    expect(() => autenticar()).toThrow()
  })
})
