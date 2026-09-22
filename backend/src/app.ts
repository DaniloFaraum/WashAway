import cors from 'cors'
import express from 'express'
import { lavaRapidosRouter } from './modules/lava-rapidos/lavaRapidos.routes.js'
import { pedidosRouter } from './modules/pedidos/pedidos.routes.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Path camelCase (não kebab-case) pra bater com `LAVA_RAPIDOS_ROUTES.list` já
  // existente em app_mobile/src/features/lava-rapidos/service/lavaRapidos.routes.ts
  // — sem isso, o app_mobile (que não muda além da BASE_URL) recebe 404.
  app.use('/lavaRapidos', lavaRapidosRouter)
  app.use('/pedidos', pedidosRouter)

  return app
}
