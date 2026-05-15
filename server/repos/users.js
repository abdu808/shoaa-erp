import { prisma } from '../db.js'

export const usersRepo = {
  list: () => prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  create: (data) => prisma.user.create({ data }),
  update: (id, data) => prisma.user.update({ where: { id }, data }),
  remove: (id) => prisma.user.delete({ where: { id } }),
  count: () => prisma.user.count(),
}
