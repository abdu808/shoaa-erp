import { usersRepo } from '../repos/users.js'
import {
  hashPassword, verifyPassword, signToken, publicUser, requireAuth,
} from '../auth.js'

export default async function authRoutes(app) {
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body || {}
    const user = await usersRepo.findByEmail(email)
    if (!user || !(await verifyPassword(password, user.password)))
      return reply.code(401).send({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' })
    return { token: signToken(user), user: publicUser(user) }
  })

  app.get('/me', { preHandler: requireAuth }, async (req) => publicUser(req.user))

  app.post('/change-password', { preHandler: requireAuth }, async (req, reply) => {
    const { current, next } = req.body || {}
    if (!next || String(next).length < 6)
      return reply.code(400).send({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
    if (!(await verifyPassword(current, req.user.password)))
      return reply.code(400).send({ error: 'كلمة المرور الحالية غير صحيحة' })
    await usersRepo.update(req.user.id, { password: await hashPassword(next) })
    return { ok: true }
  })
}
