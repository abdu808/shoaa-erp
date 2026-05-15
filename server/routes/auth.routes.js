import { usersRepo } from '../repos/users.js'
import {
  hashPassword, verifyPassword, signToken, publicUser, requireAuth,
} from '../auth.js'

// Lightweight in-memory login throttle (no extra dependency).
// Max 8 failed attempts per IP per 15 min, then 429. Cleared on success.
const attempts = new Map()
const WINDOW = 15 * 60 * 1000
const MAX = 8

export default async function authRoutes(app) {
  app.post('/login', async (req, reply) => {
    const ip = req.ip || 'unknown'
    const now = Date.now()
    const rec = attempts.get(ip)
    if (rec && now - rec.first < WINDOW && rec.count >= MAX) {
      return reply.code(429).send({ error: 'محاولات كثيرة. حاول بعد 15 دقيقة.' })
    }

    const { email, password } = req.body || {}
    const user = await usersRepo.findByEmail(email)
    if (!user || !(await verifyPassword(password, user.password))) {
      if (!rec || now - rec.first >= WINDOW) attempts.set(ip, { first: now, count: 1 })
      else rec.count++
      return reply.code(401).send({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' })
    }
    attempts.delete(ip)
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
