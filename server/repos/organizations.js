import { prisma } from '../db.js'

export const orgsRepo = {
  list: () => prisma.organization.findMany({ orderBy: { createdAt: 'desc' } }),
  findById: (id) => prisma.organization.findUnique({ where: { id } }),
  create: (data) => prisma.organization.create({ data }),
  update: (id, data) => prisma.organization.update({ where: { id }, data }),
  remove: (id) => prisma.organization.delete({ where: { id } }),
}
