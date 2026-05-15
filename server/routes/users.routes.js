import { usersRepo } from '../repos/users.js'
import { hashPassword, requireSuperAdmin, publicUser } from '../auth.js'

export default async function usersRoutes(app) {
  app.addHook('preHandler', requireSuperAdmin)

  app.get('/', async () => (await usersRepo.list()).map(publicUser))

  app.post('/', async (req, reply) => {
    const { name, email, password, role, orgId } = req.body || {}
    if (!name || !email || !password)
      return reply.code(400).send({ error: 'البيانات ناقصة' })
    if (await usersRepo.findByEmail(email))
      return reply.code(409).send({ error: 'البريد الإلكتروني مستخدم مسبقًا' })
    const user = await usersRepo.create({
      name, email,
      password: await hashPassword(password),
      role: role === 'superadmin' ? 'superadmin' : 'manager',
      orgId: role === 'manager' ? orgId || null : null,
    })
    return publicUser(user)
  })

  app.delete('/:id', async (req) => {
    await usersRepo.remove(req.params.id)
    return { ok: true }
  })
}
