import 'dotenv/config'
import { createApp } from './app.js'
import { garantirConfiguracaoDoToken } from './auth/token.js'

// Sem JWT_SECRET o servidor não sobe (o token de acesso depende dele).
garantirConfiguracaoDoToken()

const PORT = Number(process.env.PORT ?? 4000)

createApp().listen(PORT, () => {
  console.log(`backend rodando em http://localhost:${PORT}`)
})
