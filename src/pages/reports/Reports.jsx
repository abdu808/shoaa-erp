import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { Download, FileText, DollarSign, Percent, Ban } from 'lucide-react'
import { formatCurrency } from '../../utils/zatca'

const firstOfMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
const today = () => new Date().toISOString().slice(0, 10)

export default function Reports() {
  const { userData } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [orgFilter, setOrgFilter] = useState('')
  const [from, setFrom] = useState(firstOfMonth())
  const [to, setTo] = useState(today())
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'organizations')).then(snap =>
      setOrgs(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [])

  useEffect(() => {
    const isSuper = userData?.role === 'superadmin'
    const base = isSuper
      ? query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'invoices'), where('orgId', '==', userData?.orgId), orderBy('createdAt', 'desc'))
    getDocs(base).then(snap => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [userData])

  const inRange = invoices.filter(inv => {
    if (inv.status === 'cancelled' || inv.status === 'draft') return false
    if (inv.docType === 'internal') return false
    if (orgFilter && inv.orgId !== orgFilter) return false
    const d = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt)
    const ds = d.toISOString().slice(0, 10)
    return ds >= from && ds <= to
  })

  const sign = (inv) => (inv.docType === 'credit' ? -1 : 1)
  const sum = (fn) => inRange.reduce((s, inv) => s + sign(inv) * (Number(fn(inv)) || 0), 0)

  const totalSales = sum(inv => inv.subtotal)
  const totalDiscount = sum(inv => inv.discount)
  const outputVat = sum(inv => inv.vat)
  const grandTotal = sum(inv => inv.total)

  const exportCsv = () => {
    const rows = [
      ['رقم المستند', 'النوع', 'العميل', 'التاريخ', 'قبل الضريبة', 'الخصم', 'الضريبة', 'الإجمالي'],
      ...inRange.map(inv => {
        const d = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt)
        const types = { tax: 'فاتورة', credit: 'إشعار دائن', debit: 'إشعار مدين' }
        return [
          inv.invoiceNumber, types[inv.docType] || inv.docType, inv.clientName,
          d.toISOString().slice(0, 10),
          (inv.subtotal || 0).toFixed(2), (inv.discount || 0).toFixed(2),
          (inv.vat || 0).toFixed(2), (inv.total || 0).toFixed(2),
        ]
      }),
      [],
      ['الإجمالي', '', '', '', totalSales.toFixed(2), totalDiscount.toFixed(2), outputVat.toFixed(2), grandTotal.toFixed(2)],
    ]
    const csv = '﻿' + rows.map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `تقرير_ضريبي_${from}_${to}.csv`
    a.click()
  }

  return (
    <Layout>
      <PageHeader title="التقارير الضريبية" subtitle="ملخص ضريبة القيمة المضافة للفترة" />

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">من تاريخ</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">إلى تاريخ</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {userData?.role === 'superadmin' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المؤسسة</label>
              <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">كل المؤسسات</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={exportCsv}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Download size={18} /> تصدير Excel/CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">جاري التحميل...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <StatCard title="إجمالي المبيعات (قبل الضريبة)" value={formatCurrency(totalSales)} icon={DollarSign} color="blue" />
            <StatCard title="إجمالي الخصومات" value={formatCurrency(totalDiscount)} icon={Ban} color="amber" />
            <StatCard title="ضريبة المخرجات المستحقة" value={formatCurrency(outputVat)} icon={Percent} color="green" />
            <StatCard title="الإجمالي شامل الضريبة" value={formatCurrency(grandTotal)} icon={FileText} color="purple" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">تفاصيل المستندات ({inRange.length})</h3>
            </div>
            {inRange.length === 0 ? (
              <div className="text-center py-12 text-slate-400">لا توجد مستندات في هذه الفترة</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">رقم المستند</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">النوع</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">العميل</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">قبل الضريبة</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">الضريبة</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inRange.map(inv => {
                    const types = { tax: 'فاتورة', credit: 'إشعار دائن', debit: 'إشعار مدين' }
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-mono text-slate-800">{inv.invoiceNumber}</td>
                        <td className="px-6 py-3 text-slate-600">{types[inv.docType]}</td>
                        <td className="px-6 py-3 text-slate-600">{inv.clientName}</td>
                        <td className="px-6 py-3 text-slate-600">{formatCurrency((inv.docType === 'credit' ? -1 : 1) * inv.subtotal)}</td>
                        <td className="px-6 py-3 text-slate-600">{formatCurrency((inv.docType === 'credit' ? -1 : 1) * inv.vat)}</td>
                        <td className="px-6 py-3 font-medium text-slate-800">{formatCurrency((inv.docType === 'credit' ? -1 : 1) * inv.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
