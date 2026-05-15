import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import Field from '../../components/ui/Field'
import { vatNumberError } from '../../utils/zatca'

export default function ClientForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { userData } = useAuth()
  const [loading, setLoading] = useState(false)
  const [orgs, setOrgs] = useState([])
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', vatNumber: '', orgId: '',
  })

  useEffect(() => {
    api.listOrgs().then(setOrgs).catch(() => {})
    if (isEdit) {
      api.getClient(id).then(c => { if (c) setForm(c) }).catch(() => {})
    } else if (userData?.role === 'manager') {
      setForm(p => ({ ...p, orgId: userData.orgId }))
    }
  }, [id, isEdit, userData])

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const vatErr = vatNumberError(form.vatNumber, false)
    if (vatErr) { alert(vatErr); return }
    setLoading(true)
    try {
      await api.saveClient(isEdit ? id : null, form)
      navigate('/clients')
    } catch {
      alert('حدث خطأ، حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  const f = (label, name, type = 'text', placeholder = '', required = false) => (
    <Field label={label} name={name} type={type} placeholder={placeholder}
      required={required} value={form[name]} onChange={handleChange} />
  )

  return (
    <Layout>
      <PageHeader title={isEdit ? 'تعديل العميل' : 'إضافة عميل جديد'} />
      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-5">
          {f('اسم العميل *', 'name', 'text', 'اسم الشركة أو الفرد', true)}
          <div className="grid grid-cols-2 gap-4">
            {f('رقم الهاتف', 'phone', 'text', '0500000000')}
            {f('البريد الإلكتروني', 'email', 'email', 'client@email.com')}
          </div>
          {f('الرقم الضريبي (للشركات)', 'vatNumber', 'text', '300000000000003')}
          {f('العنوان', 'address', 'text', 'المدينة، المملكة العربية السعودية')}

          {userData?.role === 'superadmin' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المؤسسة *</label>
              <select name="orgId" value={form.orgId} onChange={handleChange} required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">اختر المؤسسة</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
              {loading ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة العميل')}
            </button>
            <button type="button" onClick={() => navigate('/clients')}
              className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-xl transition-all">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
