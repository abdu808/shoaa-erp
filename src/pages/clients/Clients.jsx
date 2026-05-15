import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react'

export default function Clients() {
  const { userData } = useAuth()
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchClients = async () => {
    const isSuperAdmin = userData?.role === 'superadmin'
    const q = isSuperAdmin
      ? collection(db, 'clients')
      : query(collection(db, 'clients'), where('orgId', '==', userData?.orgId))
    const snap = await getDocs(q)
    setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [userData])

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا العميل؟')) return
    await deleteDoc(doc(db, 'clients', id))
    fetchClients()
  }

  const filtered = clients.filter(c =>
    c.name?.includes(search) || c.phone?.includes(search) || c.vatNumber?.includes(search)
  )

  return (
    <Layout>
      <PageHeader
        title="العملاء"
        subtitle={`${clients.length} عميل مسجل`}
        action={
          <Link to="/clients/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Plus size={18} /> إضافة عميل
          </Link>
        }
      />

      <div className="mb-5 relative">
        <Search size={16} className="absolute right-3 top-3 text-slate-400" />
        <input
          type="text" placeholder="بحث بالاسم أو الهاتف أو الرقم الضريبي..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">جاري التحميل...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">لا يوجد عملاء</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">الاسم</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">الهاتف</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">الرقم الضريبي</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500">العنوان</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{client.name}</td>
                    <td className="px-6 py-4 text-slate-500">{client.phone || '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{client.vatNumber || '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{client.address || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <Link to={`/clients/${client.id}/edit`}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Pencil size={15} />
                        </Link>
                        <button onClick={() => handleDelete(client.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Layout>
  )
}
