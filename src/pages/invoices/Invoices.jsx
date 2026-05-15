import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import { FileText, Plus, Eye, Trash2, Search, Pencil } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/zatca'

const statusColors = {
  draft: 'bg-slate-100 text-slate-600',
  issued: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
const statusLabels = { draft: 'مسودة', issued: 'صادرة', paid: 'مدفوعة', cancelled: 'ملغاة' }

export default function Invoices() {
  const { userData } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchInvoices = async () => {
    setInvoices(await api.listInvoices({ limit: 200 }))
    setLoading(false)
  }

  useEffect(() => { fetchInvoices() }, [userData])

  const handleDelete = async (inv) => {
    if (inv.status === 'draft') {
      if (!confirm('حذف هذه المسودة نهائيًا؟')) return
      await api.deleteInvoice(inv.id)
    } else {
      if (inv.status === 'cancelled') return
      if (!confirm('لا يمكن حذف فاتورة صادرة نظاميًا. سيتم إلغاؤها مع بقاء سجلها وتسلسلها. متابعة؟')) return
      await api.cancelInvoice(inv.id)
    }
    fetchInvoices()
  }

  const filtered = invoices.filter(inv =>
    inv.invoiceNumber?.includes(search) || inv.clientName?.includes(search)
  )

  return (
    <Layout>
      <PageHeader
        title="الفواتير"
        subtitle={`${invoices.length} فاتورة`}
        action={
          <Link to="/invoices/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Plus size={18} /> فاتورة جديدة
          </Link>
        }
      />

      <div className="mb-5 relative">
        <Search size={16} className="absolute right-3 top-3 text-slate-400" />
        <input
          type="text" placeholder="بحث برقم الفاتورة أو اسم العميل..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">لا توجد فواتير</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-right font-medium text-slate-500">رقم الفاتورة</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">العميل</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">التاريخ</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">الإجمالي</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">الحالة</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-medium text-slate-800">{inv.invoiceNumber}</span>
                    {inv.docType === 'internal' && (
                      <span className="mr-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">داخلي</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{inv.clientName}</td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(inv.createdAt)}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{formatCurrency(inv.total)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>
                      {statusLabels[inv.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <Link to={`/invoices/${inv.id}`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <Eye size={15} />
                      </Link>
                      {inv.status === 'draft' && (
                        <Link to={`/invoices/${inv.id}/edit`}
                          title="تعديل المسودة"
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                          <Pencil size={15} />
                        </Link>
                      )}
                      {inv.status !== 'cancelled' && (
                        <button onClick={() => handleDelete(inv)}
                          title={inv.status === 'draft' ? 'حذف المسودة' : 'إلغاء الفاتورة'}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
