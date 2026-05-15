import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { usersRepo } from './repos/users.js'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const EXPIRES = '7d'

export const hashPassword = (pw) => bcrypt.hash(pw, 10)
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash)
export const signToken = (user) =>
  jwt.sign({ sub: user.id }, SECRET, { expiresIn: EXPIRES })

export function publicUser(u) {
  if (!u) return null
  return { uid: u.id, id: u.id, name: u.name, email: u.email, role: u.role, orgId: u.orgId }
}

// Fastify preHandler: verifies JWT, loads the user onto req.user
export async function requireAuth(req, reply) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return reply.code(401).send({ error: 'غير مصرّح' })
  try {
    const { sub } = jwt.verify(token, SECRET)
    const user = await usersRepo.findById(sub)
    if (!user) return reply.code(401).send({ error: 'الجلسة غير صالحة' })
    req.user = user
  } catch {
    return reply.code(401).send({ error: 'الجلسة منتهية' })
  }
}

export async function requireSuperAdmin(req, reply) {
  await requireAuth(req, reply)
  if (reply.sent) return
  if (req.user.role !== 'superadmin')
    return reply.code(403).send({ error: 'صلاحية مدير النظام مطلوبة' })
}

export const isSuper = (req) => req.user?.role === 'superadmin'

// orgId filter for list queries: null => unrestricted (superadmin)
export const scopeOrgId = (req) => (isSuper(req) ? null : req.user.orgId)

// Throws 403 if a manager touches a row outside their org
export function assertOwns(req, reply, rowOrgId) {
  if (isSuper(req)) return true
  if (rowOrgId !== req.user.orgId) {
    reply.code(403).send({ error: 'غير مصرّح بالوصول لهذا السجل' })
    return false
  }
  return true
}
