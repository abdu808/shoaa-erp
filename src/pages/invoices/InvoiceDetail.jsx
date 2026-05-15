import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api'
import Layout from '../../components/layout/Layout'
import { Printer, ArrowRight, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDate, generateZatcaQR } from '../../utils/zatca'
import QRCode from 'qrcode'

const statusLabels = { draft: 'مسودة', issued: 'صادرة', paid: 'مدفوعة', cancelled: 'ملغاة' }

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [orgLogo, setOrgLogo] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const printRef = useRef()

  useEffect(() => {
    api.getInvoice(id).then(data => {
      if (data) {
        setInvoice(data)
        if (data.orgId) {
          api.getOrg(data.orgId)
            .then(o => { if (o) setOrgLogo(o.logo || '') })
            .catch(() => {})
        }
        if (data.docType !== 'internal') {
          const issuedAt = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : (data.createdAt ? new Date(data.createdAt) : new Date())
          const qrValue = generateZatcaQR({
            sellerName: data.orgData?.name || '',
            taxNumber: data.orgData?.taxNumber || '',
            invoiceDate: issuedAt.toISOString(),
            totalWithVat: data.total || 0,
            vatAmount: data.vat || 0,
          })
          QRCode.toDataURL(qrValue, { width: 120 }).then(setQrDataUrl)
        }
      }
    }).catch(() => {})
  }, [id])

  const markAsPaid = async () => {
    const updated = await api.markPaid(id)
    setInvoice(p => ({ ...p, status: 'paid', audit: updated?.audit ?? p.audit }))
  }

  const handlePrint = () => {
    const prevTitle = document.title
    const docKind = invoice?.docType === 'internal' ? 'مستند داخلي'
      : invoice?.docType === 'credit' ? 'إشعار دائن'
      : invoice?.docType === 'debit' ? 'إشعار مدين'
      : 'فاتورة'
    document.title = `${docKind} ${invoice?.invoiceNumber || ''}`.trim()
    const restore = () => {
      document.title = prevTitle
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
    setTimeout(restore, 1000)
  }

  if (!invoice) return <Layout><div className="text-center py-20 text-slate-400">جاري التحميل...</div></Layout>

  const org = invoice.orgData || {}
  const client = invoice.clientData || {}
  const isInternal = invoice.docType === 'internal'
  const isNote = invoice.docType === 'credit' || invoice.docType === 'debit'
  const docTitle =
    invoice.docType === 'internal' ? 'مستند داخلي'
    : invoice.docType === 'credit' ? 'إشعار دائن ضريبي'
    : invoice.docType === 'debit' ? 'إشعار مدين ضريبي'
    : (invoice.invoiceType === 'standard' ? 'فاتورة ضريبية' : 'فاتورة ضريبية مبسطة')
  const headerColor =
    invoice.docType === 'internal' ? 'bg-amber-600'
    : invoice.docType === 'credit' ? 'bg-rose-600'
    : invoice.docType === 'debit' ? 'bg-violet-600'
    : 'bg-blue-600'

  return (
    <Layout>
      <div className="no-print flex items-center justify-between mb-6">
        <button onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm">
          <ArrowRight size={16} /> العودة للفواتير
        </button>
        <div className="flex gap-3">
          {invoice.status !== 'paid' && (
            <button onClick={markAsPaid}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
              <CheckCircle size={16} /> تعيين كمدفوعة
            </button>
          )}
          <button onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
            <Printer size={16} /> طباعة
          </button>
        </div>
      </div>

      {/* Invoice Print Area */}
      <div ref={printRef} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-3xl mx-auto print:shadow-none print:rounded-none print:border-none" id="invoice-print">
        {/* Header */}
        <div className="flex justify-between items-start mb-10 pb-8 border-b-2 border-slate-100">
          <div>
            {orgLogo && (
              <img src={orgLogo} alt="شعار" className="h-16 mb-3 object-contain" />
            )}
            <h1 className="text-3xl font-bold text-slate-800">{org.name}</h1>
            {org.nameEn && <p className="text-slate-500 text-sm">{org.nameEn}</p>}
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              {org.taxNumber && <p>الرقم الضريبي: <span className="font-mono">{org.taxNumber}</span></p>}
              {org.commercialReg && <p>السجل التجاري: <span className="font-mono">{org.commercialReg}</span></p>}
              {org.address && <p>{org.address}</p>}
              {org.phone && <p>هاتف: {org.phone}</p>}
            </div>
          </div>
          <div className="text-left">
            <div className={`${headerColor} text-white px-6 py-3 rounded-xl text-center mb-3`}>
              <p className="text-xs opacity-80">{docTitle}</p>
              <p className="font-mono font-bold text-lg">{invoice.invoiceNumber}</p>
              {isNote && invoice.refInvoice && (
                <p className="text-[10px] opacity-80 mt-1">مرجع: {invoice.refInvoice}</p>
              )}
            </div>
            <div className="text-sm text-slate-500 text-center space-y-1">
              <p>التاريخ: {formatDate(invoice.createdAt)}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                invoice.status === 'issued' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {statusLabels[invoice.status]}
              </span>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-slate-50 rounded-xl p-5 mb-8">
          <p className="text-xs font-medium text-slate-400 mb-2">{isInternal ? 'إلى الفرع / الجهة' : 'فاتورة إلى'}</p>
          <p className="font-bold text-slate-800 text-lg">{client.name}</p>
          <div className="mt-1 space-y-0.5 text-sm text-slate-500">
            {client.vatNumber && <p>الرقم الضريبي: {client.vatNumber}</p>}
            {client.address && <p>{client.address}</p>}
            {client.phone && <p>هاتف: {client.phone}</p>}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-4 py-3 text-right rounded-r-lg">#</th>
              <th className="px-4 py-3 text-right">الوصف</th>
              <th className="px-4 py-3 text-center">الكمية</th>
              <th className="px-4 py-3 text-center">سعر الوحدة</th>
              {!isInternal && <th className="px-4 py-3 text-center">الضريبة</th>}
              <th className="px-4 py-3 text-left rounded-l-lg">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => {
              const catLabels = { standard: '15%', zero: 'صفري', exempt: 'معفى' }
              return (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 text-slate-700">{item.description}</td>
                <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 text-center text-slate-600">{formatCurrency(item.unitPrice)}</td>
                {!isInternal && <td className="px-4 py-3 text-center text-slate-600">{catLabels[item.taxCat || 'standard']}</td>}
                <td className="px-4 py-3 text-left font-medium text-slate-800">{formatCurrency(item.total)}</td>
              </tr>
            )})}
          </tbody>
        </table>

        {/* Totals + QR */}
        <div className="flex justify-between items-end">
          {qrDataUrl && (
            <div className="text-center">
              <img src={qrDataUrl} alt="QR Code" className="w-28 h-28" />
              <p className="text-xs text-slate-400 mt-1">رمز الاستجابة السريعة</p>
              <p className="text-xs text-slate-400">ZATCA Phase 1</p>
            </div>
          )}
          <div className="space-y-2 min-w-64">
            <div className="flex justify-between text-sm text-slate-600 pb-2">
              <span>المجموع قبل الضريبة</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <>
                <div className="flex justify-between text-sm text-rose-600 pb-2">
                  <span>الخصم</span>
                  <span>− {formatCurrency(invoice.discount)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 pb-2">
                  <span>الصافي الخاضع</span>
                  <span>{formatCurrency(invoice.taxableBase ?? (invoice.subtotal - invoice.discount))}</span>
                </div>
              </>
            )}
            {!isInternal && (
              <div className="flex justify-between text-sm text-slate-600 pb-2">
                <span>ضريبة القيمة المضافة (15%)</span>
                <span>{formatCurrency(invoice.vat)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-slate-800 border-t-2 border-slate-200 pt-2">
              <span>الإجمالي</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            {org.iban && (
              <div className="bg-blue-50 rounded-lg p-3 mt-2">
                <p className="text-xs text-slate-500">رقم الآيبان للتحويل</p>
                <p className="font-mono text-sm font-medium text-slate-700">{org.iban}</p>
              </div>
            )}
          </div>
        </div>

        {invoice.notes && (
          <div className="border-t border-slate-100 mt-6 pt-4">
            <p className="text-xs text-slate-400 mb-1">ملاحظات</p>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </div>
        )}

        <div className="border-t border-slate-100 mt-6 pt-4 text-center text-xs text-slate-400 space-y-1">
          {isInternal ? (
            <p>مستند داخلي بين فروع نفس المنشأة (نفس الرقم الضريبي) — غير خاضع لضريبة القيمة المضافة ولا يُرفع لهيئة الزكاة</p>
          ) : isNote ? (
            <p>{docTitle} مرتبط بالفاتورة رقم ({invoice.refInvoice}) — مستند ضريبي معتمد وفق متطلبات هيئة الزكاة والضريبة والجمارك</p>
          ) : (
            <p>هذه فاتورة ضريبية إلكترونية معتمدة وفق متطلبات هيئة الزكاة والضريبة والجمارك</p>
          )}
          {invoice.createdBy?.name && (
            <p>أصدرها: {invoice.createdBy.name} · {formatDate(invoice.createdAt)}</p>
          )}
        </div>
      </div>

      {invoice.audit?.length > 0 && (
        <div className="no-print max-w-3xl mx-auto mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-700 mb-4">سجل التدقيق</h3>
          <div className="space-y-2">
            {[...invoice.audit].reverse().map((a, i) => {
              const actionLabels = { created: 'إنشاء', edited: 'تعديل', paid: 'تعيين كمدفوعة', cancelled: 'إلغاء' }
              const colors = {
                created: 'bg-blue-100 text-blue-700', edited: 'bg-amber-100 text-amber-700',
                paid: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
              }
              return (
                <div key={i} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[a.action] || 'bg-slate-100 text-slate-600'}`}>
                      {actionLabels[a.action] || a.action}
                    </span>
                    <span className="text-slate-600">{a.by}</span>
                  </div>
                  <span className="text-slate-400 text-xs">
                    {new Date(a.at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Layout>
  )
}
