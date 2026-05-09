import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config/env'
import authRoutes from './routes/auth'
import groupRoutes from './routes/groups'
import scanRoutes from './routes/scan'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
})

async function start() {
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Required so authenticate preHandler can set request.user
  app.decorateRequest('user', null)

  // Routes
  await app.register(authRoutes, { prefix: '/api' })
  await app.register(groupRoutes, { prefix: '/api' })
  await app.register(scanRoutes, { prefix: '/api' })

  // Health check — no auth required
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  console.log(`Backend running on http://0.0.0.0:${config.PORT}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
