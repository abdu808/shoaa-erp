import { prisma } from '../db.js'

export const clientsRepo = {
  // orgId null => all (superadmin); otherwise scoped
  list: (orgId) =>
    prisma.client.findMany({
      where: orgId ? { orgId } : undefined,
      orderBy: { createdAt: 'desc' },
    }),
  findById: (id) => prisma.client.findUnique({ where: { id } }),
  create: (data) => prisma.client.create({ data }),
  update: (id, data) => prisma.client.update({ where: { id }, data }),
  remove: (id) => prisma.client.delete({ where: { id } }),
}
