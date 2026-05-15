import { useState } from 'react'
import { api } from '../../api'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import { KeyRound, Download, ShieldCheck } from 'lucide-react'

export default function Settings() {
  const [cur, setCur] = useState('')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (pw1.length < 6) return setMsg({ t: 'err', m: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
    if (pw1 !== pw2) return setMsg({ t: 'err', m: 'كلمتا المرور غير متطابقتين' })
    setLoading(true)
    try {
      await api.changePassword(cur, pw1)
      setMsg({ t: 'ok', m: 'تم تغيير كلمة المرور بنجاح' })
      setCur(''); setPw1(''); setPw2('')
    } catch (e) {
      setMsg({ t: 'err', m: e.message || 'كلمة المرور الحالية غير صحيحة' })
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const data = await api.exportBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  return (
    <Layout>
      <PageHeader title="الإعدادات" subtitle="الحساب والنسخ الاحتياطي" />
      <div className="max-w-xl space-y-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <KeyRound size={20} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800">تغيير كلمة المرور</h3>
          </div>
          {msg && (
            <div className={`rounded-xl p-3 mb-4 text-sm text-center ${
              msg.t === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>{msg.m}</div>
          )}
          <form onSubmit={changePassword} className="space-y-4">
            {[
              { l: 'كلمة المرور الحالية', v: cur, s: setCur },
              { l: 'كلمة المرور الجديدة', v: pw1, s: setPw1 },
              { l: 'تأكيد كلمة المرور الجديدة', v: pw2, s: setPw2 },
            ].map((f, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.l}</label>
                <input type="password" value={f.v} onChange={e => f.s(e.target.value)} required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
              {loading ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-800">نسخة احتياطية</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            تصدير كل البيانات (المؤسسات، العملاء، الفواتير) كملف JSON يُحفظ على جهازك.
          </p>
          <button onClick={exportData} disabled={exporting}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60">
            <Download size={18} /> {exporting ? 'جاري التصدير...' : 'تصدير نسخة احتياطية'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
