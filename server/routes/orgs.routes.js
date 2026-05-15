import { orgsRepo } from '../repos/organizations.js'
import { requireAuth, requireSuperAdmin } from '../auth.js'

export default async function orgsRoutes(app) {
  // Any signed-in user can read organizations (matches old Firestore rules)
  app.get('/', { preHandler: requireAuth }, async () => orgsRepo.list())

  app.get('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const org = await orgsRepo.findById(req.params.id)
    if (!org) return reply.code(404).send({ error: 'غير موجود' })
    return org
  })

  // Only superadmin can write
  app.post('/', { preHandler: requireSuperAdmin }, async (req) =>
    orgsRepo.create(sanitize(req.body)))

  app.put('/:id', { preHandler: requireSuperAdmin }, async (req) =>
    orgsRepo.update(req.params.id, sanitize(req.body)))

  app.delete('/:id', { preHandler: requireSuperAdmin }, async (req) => {
    await orgsRepo.remove(req.params.id)
    return { ok: true }
  })
}

function sanitize(b = {}) {
  const allowed = [
    'name', 'nameEn', 'taxNumber', 'commercialReg', 'address', 'phone',
    'email', 'iban', 'invoicePrefix', 'invoiceStart', 'logo', 'active',
  ]
  const out = {}
  for (const k of allowed) if (b[k] !== undefined) out[k] = b[k]
  if (out.invoiceStart !== undefined) out.invoiceStart = parseInt(out.invoiceStart, 10) || 1
  return out
}
