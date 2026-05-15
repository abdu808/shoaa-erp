import { prisma } from '../db.js'

const COUNTER_MAP = {
  tax: { field: 'invoiceCount', suffix: '' },
  internal: { field: 'internalCount', suffix: '-D' },
  credit: { field: 'creditCount', suffix: '-CN' },
  debit: { field: 'debitCount', suffix: '-DN' },
}

// In-process serialization for the numbering transaction. One Node process
// (one container) => this guarantees gap-free, dupe-free numbering with zero
// "database locked" failures under concurrency. DB-agnostic (also correct on
// PostgreSQL; the @@unique constraint remains the hard safety net).
let writeChain = Promise.resolve()
function serialize(fn) {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(() => {}, () => {})
  return run
}

export const invoicesRepo = {
  list: ({ orgId, limit = 200 } = {}) =>
    prisma.invoice.findMany({
      where: orgId ? { orgId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),

  findById: (id) => prisma.invoice.findUnique({ where: { id } }),

  // Atomic, gap-free numbering + insert in ONE transaction.
  // DB-agnostic: uses Prisma interactive transaction (no raw SQLite).
  // UNIQUE(orgId, invoiceNumber) is the hard safety net against dupes.
  createWithNumber: async ({ org, payload }) => {
    const { field, suffix } = COUNTER_MAP[payload.docType] || COUNTER_MAP.tax
    return serialize(() => prisma.$transaction(async (tx) => {
      let counter = await tx.counter.findUnique({ where: { orgId: org.id } })
      if (!counter) {
        counter = await tx.counter.create({ data: { orgId: org.id } })
      }
      const startNum =
        payload.docType === 'tax'
          ? Math.max(1, parseInt(org.invoiceStart, 10) || 1)
          : 1
      const prev = counter[field] || 0
      const count = prev > 0 ? prev + 1 : startNum
      const prefix = org.invoicePrefix || 'INV'
      const invoiceNumber = `${prefix}${suffix}-${String(count).padStart(5, '0')}`

      await tx.counter.update({
        where: { orgId: org.id },
        data: { [field]: count },
      })
      return tx.invoice.create({
        data: { ...payload, invoiceNumber },
      })
    }))
  },

  update: (id, data) => prisma.invoice.update({ where: { id }, data }),
  remove: (id) => prisma.invoice.delete({ where: { id } }),

  // Record a (partial) payment; recompute status atomically.
  recordPayment: (id, payment, actorEmail) =>
    serialize(() => prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id } })
      if (!inv) throw new Error('غير موجود')
      const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
      const payments = [...(inv.payments || []), payment]
      const paid = round2(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0))
      let status = inv.status
      if (inv.status !== 'cancelled' && inv.status !== 'draft') {
        status = paid >= round2(inv.total) ? 'paid' : paid > 0 ? 'partial' : 'issued'
      }
      const audit = [...(inv.audit || []), {
        action: 'payment', by: actorEmail, at: new Date().toISOString(),
      }]
      return tx.invoice.update({
        where: { id }, data: { payments, status, audit },
      })
    })),
}
