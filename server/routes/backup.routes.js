import { requireAuth, isSuper, scopeOrgId } from '../auth.js'
import { orgsRepo } from '../repos/organizations.js'
import { clientsRepo } from '../repos/clients.js'
import { invoicesRepo } from '../repos/invoices.js'
import { usersRepo } from '../repos/users.js'
import { publicUser } from '../auth.js'

export default async function backupRoutes(app) {
  app.get('/', { preHandler: requireAuth }, async (req) => {
    if (isSuper(req)) {
      const [organizations, clients, invoices, users] = await Promise.all([
        orgsRepo.list(),
        clientsRepo.list(null),
        invoicesRepo.list({ orgId: null, limit: 100000 }),
        usersRepo.list(),
      ])
      return { organizations, clients, invoices, users: users.map(publicUser) }
    }
    const orgId = scopeOrgId(req)
    const [clients, invoices] = await Promise.all([
      clientsRepo.list(orgId),
      invoicesRepo.list({ orgId, limit: 100000 }),
    ])
    return { clients, invoices }
  })
}
