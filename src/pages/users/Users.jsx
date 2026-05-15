import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../../firebase'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import { UserCog, Plus, Trash2, X } from 'lucide-react'

const roleLabels = { superadmin: 'مدير النظام', manager: 'مدير مؤسسة' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [orgs, setOrgs] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'manager', orgId: '' })

  const fetchUsers = async () => {
    const [usersSnap, orgsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'organizations')),
    ])
    setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    setOrgs(orgsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا المستخدم؟')) return
    await deleteDoc(doc(db, 'users', id))
    fetchUsers()
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: form.name,
        email: form.email,
        role: form.role,
        orgId: form.role === 'manager' ? form.orgId : null,
        createdAt: serverTimestamp(),
      })
      setShowModal(false)
      setForm({ name: '', email: '', password: '', role: 'manager', orgId: '' })
      fetchUsers()
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const orgName = (orgId) => orgs.find(o => o.id === orgId)?.name || '—'

  return (
    <Layout>
      <PageHeader
        title="المستخدمون"
        subtitle={`${users.length} مستخدم`}
        action={
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Plus size={18} /> إضافة مستخدم
          </button>
        }
      />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-16">
            <UserCog size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">لا يوجد مستخدمون</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-right font-medium text-slate-500">الاسم</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">البريد الإلكتروني</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">الدور</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">المؤسسة</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 text-slate-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{user.orgId ? orgName(user.orgId) : '—'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(user.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800 text-lg">إضافة مستخدم جديد</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: 'الاسم', name: 'name', type: 'text' },
                { label: 'البريد الإلكتروني', name: 'email', type: 'email' },
                { label: 'كلمة المرور', name: 'password', type: 'password' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.name]}
                    onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                    required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">الدور</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="manager">مدير مؤسسة</option>
                  <option value="superadmin">مدير النظام</option>
                </select>
              </div>
              {form.role === 'manager' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">المؤسسة</label>
                  <select value={form.orgId} onChange={e => setForm(p => ({ ...p, orgId: e.target.value }))}
                    required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">اختر المؤسسة</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
                {loading ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
