import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import Field from '../../components/ui/Field'
import { vatNumberError } from '../../utils/zatca'

export default function OrganizationForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', nameEn: '', taxNumber: '', commercialReg: '',
    address: '', phone: '', email: '', iban: '', invoicePrefix: '',
    invoiceStart: '1', logo: '', active: true,
  })

  useEffect(() => {
    if (isEdit) {
      api.getOrg(id).then(o => { if (o) setForm(o) }).catch(() => {})
    }
  }, [id, isEdit])

  const handleChange = e => {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const vatErr = vatNumberError(form.taxNumber, false)
    if (vatErr) { alert(vatErr); return }
    setLoading(true)
    try {
      await api.saveOrg(isEdit ? id : null, form)
      navigate('/organizations')
    } catch (err) {
      alert('حدث خطأ، حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  const f = (label, name, type = 'text', placeholder = '') => (
    <Field label={label} name={name} type={type} placeholder={placeholder}
      value={form[name]} onChange={handleChange} />
  )

  const handleLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const max = 300
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        setForm(p => ({ ...p, logo: canvas.toDataURL('image/jpeg', 0.8) }))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  return (
    <Layout>
      <PageHeader title={isEdit ? 'تعديل المؤسسة' : 'إضافة مؤسسة جديدة'} />
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {f('اسم المؤسسة (عربي) *', 'name', 'text', 'معهد شعاع')}
            {f('اسم المؤسسة (إنجليزي)', 'nameEn', 'text', 'Shoaa Institute')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {f('الرقم الضريبي', 'taxNumber', 'text', '300000000000003')}
            {f('رقم السجل التجاري', 'commercialReg', 'text', '1234567890')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {f('رقم الهاتف', 'phone', 'text', '0500000000')}
            {f('البريد الإلكتروني', 'email', 'email', 'info@example.com')}
          </div>
          {f('العنوان', 'address', 'text', 'الرياض، المملكة العربية السعودية')}
          <div className="grid grid-cols-2 gap-4">
            {f('IBAN', 'iban', 'text', 'SA0000000000000000000000')}
            {f('بادئة رقم الفاتورة', 'invoicePrefix', 'text', 'INV')}
          </div>
          <div>
            {f('رقم بداية الفواتير', 'invoiceStart', 'number', '1')}
            <p className="text-xs text-slate-400 mt-1">
              أول فاتورة ستبدأ من هذا الرقم (مثلاً 501 لمتابعة التسلسل من نظام سابق). لا يمكن تغييره بعد إصدار أول فاتورة.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">شعار المؤسسة</label>
            <div className="flex items-center gap-4">
              {form.logo && (
                <img src={form.logo} alt="شعار" className="w-16 h-16 object-contain border border-slate-200 rounded-xl bg-white p-1" />
              )}
              <input type="file" accept="image/*" onChange={handleLogo}
                className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-600 file:text-sm" />
              {form.logo && (
                <button type="button" onClick={() => setForm(p => ({ ...p, logo: '' }))}
                  className="text-xs text-red-500 hover:text-red-600">إزالة</button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">يظهر في رأس الفاتورة. يُضغط تلقائيًا.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
              {loading ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة المؤسسة')}
            </button>
            <button type="button" onClick={() => navigate('/organizations')}
              className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-xl transition-all">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
