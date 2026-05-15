import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

import { seedAdmin } from './seed.js'
import { disconnect } from './db.js'
import authRoutes from './routes/auth.routes.js'
import usersRoutes from './routes/users.routes.js'
import orgsRoutes from './routes/orgs.routes.js'
import clientsRoutes from './routes/clients.routes.js'
import invoicesRoutes from './routes/invoices.routes.js'
import backupRoutes from './routes/backup.routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = parseInt(process.env.PORT, 10) || 8080
const PROD = process.env.NODE_ENV === 'production'

const app = Fastify({ bodyLimit: 5 * 1024 * 1024 }) // 5MB (base64 logos)

// CORS only needed in dev (Vite on a different port). Same-origin in prod.
if (!PROD) {
  await app.register(fastifyCors, { origin: true })
}

// API routes
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(usersRoutes, { prefix: '/api/users' })
await app.register(orgsRoutes, { prefix: '/api/orgs' })
await app.register(clientsRoutes, { prefix: '/api/clients' })
await app.register(invoicesRoutes, { prefix: '/api/invoices' })
await app.register(backupRoutes, { prefix: '/api/backup' })

app.get('/api/health', async () => ({ ok: true }))

// Serve built React (SPA) in production
const publicDir = join(__dirname, 'public')
if (existsSync(publicDir)) {
  await app.register(fastifyStatic, { root: publicDir })
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url.startsWith('/api')) return reply.code(404).send({ error: 'غير موجود' })
    return reply.sendFile('index.html')
  })
}

await seedAdmin()

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => console.log(`[server] listening on :${PORT}`))
  .catch((e) => { console.error(e); process.exit(1) })

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => { await disconnect(); process.exit(0) })
}
