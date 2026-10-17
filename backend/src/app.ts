import cors from 'cors'
import type { NextFunction, Request, Response } from 'express'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { openApiDocument } from './docs/openapi.js'
import {
  configLimiteEsqueciSenhaDoAmbiente,
  configLimiteTentativasDoAmbiente,
  limiteTentativas,
  type ConfigLimiteTentativas,
} from './middlewares/limiteTentativas.js'
import { authClienteRouter, clientesRouter } from './modules/clientes/clientes.routes.js'
import { contratosRouter } from './modules/contratos/contratos.routes.js'
import { solicitacaoExclusaoEmpresaRouter, solicitacoesExclusaoInternoRouter } from './modules/exclusoes/exclusoes.routes.js'
import { horariosRouter } from './modules/horarios/horarios.routes.js'
import { authInternoRouter } from './modules/internos/internos.routes.js'
import { intercorrenciasRouter } from './modules/intercorrencias/intercorrencias.routes.js'
import { itensServicoRouter } from './modules/itens-servico/itensServico.routes.js'
import { lavaRapidosRouter } from './modules/lava-rapidos/lavaRapidos.routes.js'
import { authLavaRapidoRouter } from './modules/lava-rapidos/senhas.routes.js'
import { onboardingRouter } from './modules/onboarding/onboarding.routes.js'
import { pedidosRouter } from './modules/pedidos/pedidos.routes.js'
import { servicosRouter } from './modules/servicos/servicos.routes.js'
import { veiculosRouter } from './modules/veiculos/veiculos.routes.js'

export interface OpcoesApp {
  /** Limite de tentativas de login/cadastro; padrão: env (LIMITE_TENTATIVAS…). */
  limiteTentativas?: ConfigLimiteTentativas
  /** Limite do "esqueci minha senha" do painel; padrão: env (LIMITE_ESQUECI_SENHA…). */
  limiteEsqueciSenha?: ConfigLimiteTentativas
}

export function createApp({
  limiteTentativas: configLimite = configLimiteTentativasDoAmbiente(),
  limiteEsqueciSenha: configLimiteEsqueciSenha = configLimiteEsqueciSenhaDoAmbiente(),
}: OpcoesApp = {}) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  // Limite de tentativas (I17): um contador por rota e por app (em memória).
  // Registrado antes dos routers; passa adiante (next) enquanto não estoura.
  app.post('/auth/cliente/login', limiteTentativas(configLimite, { identificador: 'email', soFalhasContam: true }))
  app.post('/lavaRapidos/login', limiteTentativas(configLimite, { identificador: 'cnpj', soFalhasContam: true }))
  app.post('/auth/interno/login', limiteTentativas(configLimite, { identificador: 'email', soFalhasContam: true }))
  app.post('/auth/cliente/cadastro', limiteTentativas(configLimite, { identificador: 'email' }))
  // Retomar uma solicitação pendente confere e-mail + senha: mesmo limite do login.
  app.post('/onboarding/solicitacoes', limiteTentativas(configLimite, { identificador: 'cnpj', soFalhasContam: true }))
  // i17-senha-gerada: o "esqueci" sempre responde 200 e envia e-mail — toda
  // tentativa conta (não vira disparador de e-mails). A troca confere a
  // `senhaAtual` (token normal): só falhas contam; a chave é só o IP (um campo
  // qualquer no body não abre contador novo).
  app.post('/auth/lava-rapido/esqueci-senha', limiteTentativas(configLimiteEsqueciSenha, { identificador: 'email' }))
  app.post('/auth/lava-rapido/trocar-senha', limiteTentativas(configLimite, { identificador: 'nenhum', soFalhasContam: true }))

  app.get('/api-docs.json', (_req, res) => res.json(openApiDocument))
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))

  // Path camelCase (não kebab-case) pra bater com `LAVA_RAPIDOS_ROUTES.list` já
  // existente em app_mobile/src/features/lava-rapidos/service/lavaRapidos.routes.ts
  // — sem isso, o app_mobile (que não muda além da BASE_URL) recebe 404.
  app.use('/lavaRapidos/:id/horarios', horariosRouter)
  // Exclusão por solicitação (i17-interno-exclusao): a empresa só solicita.
  app.use('/lavaRapidos/me/solicitacao-exclusao', solicitacaoExclusaoEmpresaRouter)
  app.use('/lavaRapidos', lavaRapidosRouter)
  app.use('/pedidos', pedidosRouter)
  app.use('/servicos', servicosRouter)
  app.use('/itensServico', itensServicoRouter)
  app.use('/intercorrencias', intercorrenciasRouter)
  app.use('/veiculos', veiculosRouter)
  // Conta do cliente do app (I1/I2): cadastro/login públicos, /clientes/me com token.
  app.use('/auth/cliente', authClienteRouter)
  app.use('/clientes', clientesRouter)
  // Senha do painel (i17-senha-gerada): troca obrigatória e "esqueci minha senha".
  app.use('/auth/lava-rapido', authLavaRapidoRouter)
  // "BackEnd Onboard": fluxo de solicitação + contrato, separado da aplicação.
  app.use('/onboarding', onboardingRouter)
  app.use('/contratos', contratosRouter)
  // Equipe WashAway (i17-interno-exclusao): login e rotas internas (permissão admin).
  app.use('/auth/interno', authInternoRouter)
  app.use('/interno/solicitacoes-exclusao', solicitacoesExclusaoInternoRouter)

  // Express 4.x não repassa rejeição de Promise em handler assíncrono pro
  // middleware de erro sozinho — cada rota usa `asyncHandler` pra chamar
  // `next(error)`, e este middleware fecha o ciclo devolvendo 500 em vez de
  // deixar a rejeição sem destino (o que derrubaria o processo no Node 15+).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // JSON malformado: o erro do body-parser carrega o body cru (que pode ter
    // senha, ex.: /auth/cliente/login) — responde 400 sem logar nada.
    if ((err as { type?: string } | null)?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'JSON inválido no corpo da requisição' })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'Erro interno' })
  })

  return app
}
