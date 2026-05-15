import { clientsRepo } from '../repos/clients.js'
import { requireAuth, scopeOrgId, assertOwns, isSuper } from '../auth.js'

export default async function clientsRoutes(app) {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (req) => clientsRepo.list(scopeOrgId(req)))

  app.get('/:id', async (req, reply) => {
    const c = await clientsRepo.findById(req.params.id)
    if (!c) return reply.code(404).send({ error: 'غير موجود' })
    if (!assertOwns(req, reply, c.orgId)) return
    return c
  })

  app.post('/', async (req) => {
    const data = sanitize(req.body)
    // Managers can only create for their own org (server-enforced)
    data.orgId = isSuper(req) ? data.orgId : req.user.orgId
    return clientsRepo.create(data)
  })

  app.put('/:id', async (req, reply) => {
    const c = await clientsRepo.findById(req.params.id)
    if (!c) return reply.code(404).send({ error: 'غير موجود' })
    if (!assertOwns(req, reply, c.orgId)) return
    const data = sanitize(req.body)
    if (!isSuper(req)) data.orgId = req.user.orgId
    return clientsRepo.update(req.params.id, data)
  })

  app.delete('/:id', async (req, reply) => {
    const c = await clientsRepo.findById(req.params.id)
    if (!c) return reply.code(404).send({ error: 'غير موجود' })
    if (!assertOwns(req, reply, c.orgId)) return
    await clientsRepo.remove(req.params.id)
    return { ok: true }
  })
}

function sanitize(b = {}) {
  const allowed = ['orgId', 'name', 'phone', 'email', 'address', 'vatNumber']
  const out = {}
  for (const k of allowed) if (b[k] !== undefined) out[k] = b[k]
  return out
}
