import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, getDocs, getDoc, updateDoc, arrayUnion, query, where, orderBy, serverTimestamp, runTransaction, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import { Plus, Trash2 } from 'lucide-react'
import { formatCurrency, toEnglishDigits } from '../../utils/zatca'

const emptyItem = { description: '', quantity: 1, unitPrice: 0, taxCat: 'standard' }

const TAX_CATS = {
  standard: { label: 'أساسي 15%', rate: 0.15 },
  zero: { label: 'صفري 0%', rate: 0 },
  exempt: { label: 'معفى', rate: 0 },
}

export default function InvoiceForm() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const isEdit = !!editId
  const { userData } = useAuth()
  const [loading, setLoading] = useState(false)
  const [orgs, setOrgs] = useState([])
  const [clients, setClients] = useState([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('issued')
  const [docType, setDocType] = useState('tax')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState('value')
  const [clientMode, setClientMode] = useState('existing')
  const [quickName, setQuickName] = useState('')
  const [quickNumber, setQuickNumber] = useState('')
  const [refInvoice, setRefInvoice] = useState('')
  const [orgInvoices, setOrgInvoices] = useState([])

  useEffect(() => {
    getDocs(collection(db, 'organizations')).then(snap =>
      setOrgs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    if (userData?.role === 'manager') setSelectedOrg(userData.orgId)
  }, [userData])

  useEffect(() => {
    if (!selectedOrg) { setClients([]); setOrgInvoices([]); return }
    getDocs(query(collection(db, 'clients'), where('orgId', '==', selectedOrg))).then(snap =>
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
    getDocs(query(collection(db, 'invoices'), where('orgId', '==', selectedOrg), orderBy('createdAt', 'desc'))).then(snap =>
      setOrgInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(inv => inv.docType === 'tax'))
    )
  }, [selectedOrg])

  useEffect(() => {
    if (!isEdit) return
    getDoc(doc(db, 'invoices', editId)).then(snap => {
      if (!snap.exists()) return navigate('/invoices')
      const d = snap.data()
      if (d.status !== 'draft') { alert('لا يمكن تعديل مستند صادر — يمكن تعديل المسودّات فقط'); return navigate('/invoices') }
      setDocType(d.docType || 'tax')
      setSelectedOrg(d.orgId || '')
      setNotes(d.notes || '')
      setStatus(d.status || 'draft')
      setDiscount(d.discount || 0)
      setDiscountType(d.discountType || 'value')
      setRefInvoice(d.refInvoice || '')
      setItems((d.items || [{ ...emptyItem }]).map(it => ({
        description: it.description, quantity: it.quantity,
        unitPrice: it.unitPrice, taxCat: it.taxCat || 'standard',
      })))
      if (d.clientId) { setClientMode('existing'); setSelectedClient(d.clientId) }
      else { setClientMode('quick'); setQuickName(d.clientData?.name || ''); setQuickNumber(d.clientData?.phone || '') }
    })
  }, [isEdit, editId, navigate])

  const updateItem = (i, field, value) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100
  const isInternal = docType === 'internal'
  const isNote = docType === 'credit' || docType === 'debit'
  const num = (v) => Number(toEnglishDigits(v)) || 0
  const lineTotal = (it) => round2(num(it.quantity) * num(it.unitPrice))
  const subtotal = round2(items.reduce((s, it) => s + lineTotal(it), 0))
  const rawDiscount = discountType === 'percent'
    ? subtotal * (num(discount) / 100)
    : num(discount)
  const discountVal = round2(Math.min(Math.max(rawDiscount, 0), subtotal))
  // discount distributed proportionally; VAT only on standard-rated portion
  const standardBase = round2(items
    .filter(it => (it.taxCat || 'standard') === 'standard')
    .reduce((s, it) => s + lineTotal(it), 0))
  const discountRatio = subtotal > 0 ? discountVal / subtotal : 0
  const taxableStandard = round2(standardBase * (1 - discountRatio))
  const taxableBase = round2(subtotal - discountVal)
  const vat = isInternal ? 0 : round2(taxableStandard * 0.15)
  const total = round2(taxableBase + vat)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedOrg) return alert('اختر المؤسسة')
    const useQuick = clientMode === 'quick'
    if (useQuick && !quickName.trim()) return alert('أدخل اسم العميل')
    if (!useQuick && !selectedClient) return alert('اختر العميل')
    if (isNote && !refInvoice.trim()) return alert('أدخل رقم الفاتورة المرجعية للإشعار')
    setLoading(true)
    try {
      const orgData = orgs.find(o => o.id === selectedOrg)
      const existingClient = clients.find(c => c.id === selectedClient)
      const clientData = useQuick
        ? { name: quickName.trim(), vatNumber: '', address: '', phone: quickNumber.trim() }
        : {
            name: existingClient?.name, vatNumber: existingClient?.vatNumber,
            address: existingClient?.address, phone: existingClient?.phone,
          }
      const actor = {
        uid: userData?.uid || null,
        name: userData?.name || '',
        email: userData?.email || '',
      }
      const itemsData = items.map(it => ({
        description: it.description,
        quantity: num(it.quantity),
        unitPrice: round2(num(it.unitPrice)),
        taxCat: it.taxCat || 'standard',
        total: round2(num(it.quantity) * num(it.unitPrice)),
      }))

      if (isEdit) {
        await updateDoc(doc(db, 'invoices', editId), {
          docType,
          refInvoice: isNote ? refInvoice.trim() : null,
          invoiceType: isInternal ? null : (clientData?.vatNumber ? 'standard' : 'simplified'),
          clientId: useQuick ? null : selectedClient,
          clientName: clientData?.name,
          clientData,
          items: itemsData,
          subtotal, discount: discountVal, discountType, taxableBase, vat, total, notes, status,
          audit: arrayUnion({ action: 'edited', by: actor.email, at: new Date().toISOString() }),
          updatedAt: serverTimestamp(),
        })
        navigate('/invoices')
        return
      }

      const counterRef = doc(db, 'counters', selectedOrg)
      const invoiceRef = doc(collection(db, 'invoices'))

      await runTransaction(db, async (tx) => {
        const counterSnap = await tx.get(counterRef)
        const counterData = counterSnap.exists() ? counterSnap.data() : {}
        const counterMap = {
          tax: { field: 'invoiceCount', suffix: '' },
          internal: { field: 'internalCount', suffix: '-D' },
          credit: { field: 'creditCount', suffix: '-CN' },
          debit: { field: 'debitCount', suffix: '-DN' },
        }
        const { field: countField, suffix } = counterMap[docType]
        const startNum = docType === 'tax'
          ? Math.max(1, parseInt(orgData?.invoiceStart, 10) || 1)
          : 1
        const count = counterData[countField] != null
          ? counterData[countField] + 1
          : startNum
        const basePrefix = orgData?.invoicePrefix || 'INV'
        const invoiceNumber = `${basePrefix}${suffix}-${String(count).padStart(5, '0')}`

        tx.set(counterRef, { [countField]: count }, { merge: true })
        tx.set(invoiceRef, {
          orgId: selectedOrg,
          orgName: orgData?.name,
          docType,
          refInvoice: isNote ? refInvoice.trim() : null,
          invoiceType: isInternal
            ? null
            : (clientData?.vatNumber ? 'standard' : 'simplified'),
          orgData: {
            name: orgData?.name, nameEn: orgData?.nameEn,
            taxNumber: orgData?.taxNumber, commercialReg: orgData?.commercialReg,
            address: orgData?.address, phone: orgData?.phone,
            iban: orgData?.iban,
          },
          clientId: useQuick ? null : selectedClient,
          clientName: clientData?.name,
          clientData,
          invoiceNumber,
          items: itemsData,
          subtotal,
          discount: discountVal,
          discountType,
          taxableBase,
          vat, total, notes, status,
          createdBy: actor,
          audit: [{ action: 'created', by: actor.email, at: new Date().toISOString() }],
          createdAt: serverTimestamp(),
        })
      })
      navigate('/invoices')
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء الحفظ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <PageHeader title={isEdit ? 'تعديل المسودّة' : 'إنشاء مستند جديد'} />
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">نوع المستند *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { v: 'tax', t: 'فاتورة ضريبية', d: 'عميل خارجي · 15% · QR', on: 'border-blue-500 bg-blue-50' },
                { v: 'internal', t: 'مستند داخلي', d: 'بين الفروع · بدون ضريبة', on: 'border-amber-500 bg-amber-50' },
                { v: 'credit', t: 'إشعار دائن', d: 'مرتجع / تخفيض', on: 'border-rose-500 bg-rose-50' },
                { v: 'debit', t: 'إشعار مدين', d: 'رسوم إضافية', on: 'border-violet-500 bg-violet-50' },
              ].map(o => (
                <button key={o.v} type="button" onClick={() => setDocType(o.v)}
                  className={`p-4 rounded-xl border-2 text-right transition-all ${
                    docType === o.v ? o.on : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <p className="font-semibold text-slate-800 text-sm">{o.t}</p>
                  <p className="text-xs text-slate-500 mt-1">{o.d}</p>
                </button>
              ))}
            </div>
          </div>

          {isNote && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الفاتورة المرجعية *</label>
              <select value={refInvoice}
                onChange={e => {
                  setRefInvoice(e.target.value)
                  const src = orgInvoices.find(inv => inv.invoiceNumber === e.target.value)
                  if (src) {
                    setClientMode('quick')
                    setQuickName(src.clientData?.name || '')
                    setQuickNumber(src.clientData?.phone || '')
                  }
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">اختر الفاتورة الأصلية</option>
                {orgInvoices.map(inv => (
                  <option key={inv.id} value={inv.invoiceNumber}>
                    {inv.invoiceNumber} — {inv.clientName} — {Number(inv.total || 0).toFixed(2)} ر.س
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">يجب أن يشير الإشعار لفاتورة ضريبية أصلية (متطلب نظامي) — يُسحب العميل تلقائيًا</p>
            </div>
          )}
          <h3 className="font-semibold text-slate-700">{isInternal ? 'معلومات المستند' : 'معلومات الفاتورة'}</h3>
          {userData?.role === 'superadmin' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المؤسسة *</label>
              <select value={selectedOrg} onChange={e => { setSelectedOrg(e.target.value); setSelectedClient('') }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">اختر المؤسسة</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">
                {isInternal ? 'الفرع / الجهة *' : 'العميل *'}
              </label>
              {!isInternal && (
                <div className="flex gap-1 text-xs">
                  <button type="button" onClick={() => setClientMode('existing')}
                    className={`px-2.5 py-1 rounded-lg ${clientMode === 'existing' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-400'}`}>
                    عميل مسجّل
                  </button>
                  <button type="button" onClick={() => setClientMode('quick')}
                    className={`px-2.5 py-1 rounded-lg ${clientMode === 'quick' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-400'}`}>
                    عميل سريع (نقدي)
                  </button>
                </div>
              )}
            </div>
            {clientMode === 'existing' || isInternal ? (
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">{isInternal ? 'اختر الفرع / الجهة' : 'اختر العميل'}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input value={quickName} onChange={e => setQuickName(e.target.value)}
                  placeholder="اسم العميل *"
                  className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={quickNumber} onChange={e => setQuickNumber(e.target.value)}
                  placeholder="رقم الجوال / الهوية (اختياري)"
                  className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="col-span-2 text-xs text-slate-400">
                  للعملاء النقديين — لن يُحفظ في سجل العملاء، فاتورة ضريبية مبسطة.
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">الحالة</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="issued">صادرة</option>
              <option value="draft">مسودة</option>
              <option value="paid">مدفوعة</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">بنود الفاتورة</h3>
            <button type="button" onClick={() => setItems(p => [...p, { ...emptyItem }])}
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
              <Plus size={16} /> إضافة بند
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-2">
              <div className="col-span-5">الوصف</div>
              <div className="col-span-1 text-center">الكمية</div>
              <div className="col-span-2 text-center">سعر الوحدة</div>
              <div className="col-span-3 text-center">التصنيف الضريبي</div>
              <div className="col-span-1"></div>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  className="col-span-5 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="وصف الخدمة أو المنتج"
                  value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} required
                />
                <input
                  className="col-span-1 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="text" inputMode="decimal" value={item.quantity}
                  onChange={e => updateItem(i, 'quantity', toEnglishDigits(e.target.value))}
                />
                <input
                  className="col-span-2 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="text" inputMode="decimal" value={item.unitPrice}
                  onChange={e => updateItem(i, 'unitPrice', toEnglishDigits(e.target.value))}
                />
                <select
                  className="col-span-3 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  value={item.taxCat || 'standard'} disabled={isInternal}
                  onChange={e => updateItem(i, 'taxCat', e.target.value)}>
                  {Object.entries(TAX_CATS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                  disabled={items.length === 1}
                  className="col-span-1 flex justify-center text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 mt-5 pt-4 max-w-xs mr-auto">
            <div className="flex items-center justify-between mb-3 gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">الخصم</label>
              <div className="flex items-center gap-1">
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                  <button type="button" onClick={() => setDiscountType('value')}
                    className={`px-2 py-1.5 ${discountType === 'value' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                    ر.س
                  </button>
                  <button type="button" onClick={() => setDiscountType('percent')}
                    className={`px-2 py-1.5 ${discountType === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                    %
                  </button>
                </div>
                <input type="text" inputMode="decimal" value={discount}
                  onChange={e => setDiscount(toEnglishDigits(e.target.value))}
                  className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>المجموع قبل الضريبة</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-sm text-rose-600">
                  <span>الخصم{discountType === 'percent' ? ` (${num(discount)}%)` : ''}</span>
                  <span>− {formatCurrency(discountVal)}</span>
                </div>
              )}
              {discountVal > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>الصافي الخاضع</span>
                  <span>{formatCurrency(taxableBase)}</span>
                </div>
              )}
              {!isInternal && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>ضريبة القيمة المضافة (15%)</span>
                  <span>{formatCurrency(vat)}</span>
                </div>
              )}
              {isInternal && (
                <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                  مستند داخلي بين فروع نفس المنشأة — غير خاضع لضريبة القيمة المضافة
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-2">
                <span>الإجمالي</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">ملاحظات</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder="أي ملاحظات إضافية..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
            {loading ? 'جاري الحفظ...' : `إصدار ${
              { tax: 'الفاتورة الضريبية', internal: 'المستند الداخلي', credit: 'الإشعار الدائن', debit: 'الإشعار المدين' }[docType]
            }`}
          </button>
          <button type="button" onClick={() => navigate('/invoices')}
            className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-3 rounded-xl transition-all">
            إلغاء
          </button>
        </div>
      </form>
    </Layout>
  )
}
