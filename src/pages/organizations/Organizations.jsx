import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Link } from 'react-router-dom'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react'

export default function Organizations() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrgs = async () => {
    setOrgs(await api.listOrgs())
    setLoading(false)
  }

  useEffect(() => { fetchOrgs() }, [])

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذه المؤسسة؟')) return
    await api.deleteOrg(id)
    fetchOrgs()
  }

  return (
    <Layout>
      <PageHeader
        title="المؤسسات"
        subtitle="إدارة جميع المؤسسات والفروع"
        action={
          <Link to="/organizations/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Plus size={18} /> إضافة مؤسسة
          </Link>
        }
      />

      {loading ? (
        <div className="text-center py-20 text-slate-400">جاري التحميل...</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">لا توجد مؤسسات بعد</p>
          <Link to="/organizations/new" className="text-blue-600 text-sm mt-2 inline-block">إضافة أول مؤسسة</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orgs.map(org => (
            <div key={org.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Building2 size={22} className="text-blue-600" />
                </div>
                <div className="flex gap-2">
                  <Link to={`/organizations/${org.id}/edit`}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <Pencil size={16} />
                  </Link>
                  <button onClick={() => handleDelete(org.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{org.name}</h3>
              <p className="text-slate-500 text-sm mb-3">{org.commercialReg && `س.ت: ${org.commercialReg}`}</p>
              <div className="border-t border-slate-100 pt-3 space-y-1">
                {org.taxNumber && <p className="text-xs text-slate-400">الرقم الضريبي: {org.taxNumber}</p>}
                {org.phone && <p className="text-xs text-slate-400">الهاتف: {org.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
