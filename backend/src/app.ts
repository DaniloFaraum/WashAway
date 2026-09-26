import cors from 'cors'
import type { NextFunction, Request, Response } from 'express'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { openApiDocument } from './docs/openapi.js'
import { intercorrenciasRouter } from './modules/intercorrencias/intercorrencias.routes.js'
import { lavaRapidosRouter } from './modules/lava-rapidos/lavaRapidos.routes.js'
import { pedidosRouter } from './modules/pedidos/pedidos.routes.js'
import { servicosRouter } from './modules/servicos/servicos.routes.js'
import { veiculosRouter } from './modules/veiculos/veiculos.routes.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/api-docs.json', (_req, res) => res.json(openApiDocument))
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))

  // Path camelCase (não kebab-case) pra bater com `LAVA_RAPIDOS_ROUTES.list` já
  // existente em app_mobile/src/features/lava-rapidos/service/lavaRapidos.routes.ts
  // — sem isso, o app_mobile (que não muda além da BASE_URL) recebe 404.
  app.use('/lavaRapidos', lavaRapidosRouter)
  app.use('/pedidos', pedidosRouter)
  app.use('/servicos', servicosRouter)
  app.use('/intercorrencias', intercorrenciasRouter)
  app.use('/veiculos', veiculosRouter)

  // Express 4.x não repassa rejeição de Promise em handler assíncrono pro
  // middleware de erro sozinho — cada rota usa `asyncHandler` pra chamar
  // `next(error)`, e este middleware fecha o ciclo devolvendo 500 em vez de
  // deixar a rejeição sem destino (o que derrubaria o processo no Node 15+).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'Erro interno' })
  })

  return app
}
