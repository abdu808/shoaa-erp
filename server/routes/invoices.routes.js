import { invoicesRepo } from '../repos/invoices.js'
import { orgsRepo } from '../repos/organizations.js'
import { requireAuth, scopeOrgId, assertOwns, isSuper } from '../auth.js'

export default async function invoicesRoutes(app) {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (req) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000)
    return invoicesRepo.list({ orgId: scopeOrgId(req), limit })
  })

  app.get('/:id', async (req, reply) => {
    const inv = await invoicesRepo.findById(req.params.id)
    if (!inv) return reply.code(404).send({ error: 'غير موجود' })
    if (!assertOwns(req, reply, inv.orgId)) return
    return inv
  })

  // Create with atomic, gap-free numbering (transaction in the repo)
  app.post('/', async (req, reply) => {
    const p = req.body || {}
    const orgId = isSuper(req) ? p.orgId : req.user.orgId
    if (!orgId) return reply.code(400).send({ error: 'المؤسسة مطلوبة' })
    const org = await orgsRepo.findById(orgId)
    if (!org) return reply.code(400).send({ error: 'مؤسسة غير صالحة' })

    const actor = { uid: req.user.id, name: req.user.name, email: req.user.email }
    const payload = {
      orgId,
      orgName: p.orgName ?? org.name,
      docType: p.docType || 'tax',
      refInvoice: p.refInvoice ?? null,
      invoiceType: p.invoiceType ?? null,
      orgData: p.orgData ?? {},
      clientId: p.clientId ?? null,
      clientName: p.clientName ?? null,
      clientData: p.clientData ?? {},
      items: p.items ?? [],
      subtotal: +p.subtotal || 0,
      discount: +p.discount || 0,
      discountType: p.discountType || 'value',
      taxableBase: +p.taxableBase || 0,
      vat: +p.vat || 0,
      total: +p.total || 0,
      notes: p.notes ?? null,
      status: p.status || 'issued',
      createdBy: actor,
      audit: [{ action: 'created', by: actor.email, at: new Date().toISOString() }],
    }
    return invoicesRepo.createWithNumber({ org, payload })
  })

  // Edit draft only
  app.put('/:id/draft', async (req, reply) => {
    const inv = await invoicesRepo.findById(req.params.id)
    if (!inv) return reply.code(404).send({ error: 'غير موجود' })
    if (!assertOwns(req, reply, inv.orgId)) return
    if (inv.status !== 'draft')
      return reply.code(400).send({ error: 'لا يمكن تعديل مستند صادر' })
    const p = req.body || {}
    const audit = [...(inv.audit || []), {
      action: 'edited', by: req.user.email, at: new Date().toISOString(),
    }]
    return invoicesRepo.update(inv.id, {
      docType: p.docType ?? inv.docType,
      refInvoice: p.refInvoice ?? null,
      invoiceType: p.invoiceType ?? null,
      clientId: p.clientId ?? null,
      clientName: p.clientName ?? null,
      clientData: p.clientData ?? {},
      items: p.items ?? [],
      subtotal: +p.subtotal || 0,
      discount: +p.discount || 0,
      discountType: p.discountType || 'value',
      taxableBase: +p.taxableBase || 0,
      vat: +p.vat || 0,
      total: +p.total || 0,
      notes: p.notes ?? null,
      status: p.status || 'draft',
      audit,
    })
  })

  const transition = (action, status) => async (req, reply) => {
    const inv = await invoicesRepo.findById(req.params.id)
    if (!inv) return reply.code(404).send({ error: 'غير موجود' })
    if (!assertOwns(req, reply, inv.orgId)) return
    const audit = [...(inv.audit || []), {
      action, by: req.user.email, at: new Date().toISOString(),
    }]
    return invoicesRepo.update(inv.id, { status, audit })
  }
  app.post('/:id/pay', transition('paid', 'paid'))
  app.post('/:id/cancel', transition('cancelled', 'cancelled'))

  app.delete('/:id', async (req, reply) => {
    const inv = await invoicesRepo.findById(req.params.id)
    if (!inv) return reply.code(404).send({ error: 'غير موجود' })
    if (!assertOwns(req, reply, inv.orgId)) return
    await invoicesRepo.remove(req.params.id)
    return { ok: true }
  })
}
