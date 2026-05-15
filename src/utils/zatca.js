// ZATCA Phase 1 QR Code - TLV encoding
function toTLV(tag, value) {
  const encoder = new TextEncoder()
  const valueBytes = encoder.encode(value)
  return new Uint8Array([tag, valueBytes.length, ...valueBytes])
}

export function generateZatcaQR({ sellerName, taxNumber, invoiceDate, totalWithVat, vatAmount }) {
  const tlv = new Uint8Array([
    ...toTLV(1, sellerName),
    ...toTLV(2, taxNumber),
    ...toTLV(3, invoiceDate),
    ...toTLV(4, totalWithVat.toFixed(2)),
    ...toTLV(5, vatAmount.toFixed(2)),
  ])
  return btoa(String.fromCharCode(...tlv))
}

export function formatCurrency(amount) {
  const n = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
  return `${n} ر.س`
}

export function formatDate(date) {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : new Date(date)
  const greg = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
  const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(d)
  return `${greg} م — ${hijri}`
}

export function generateInvoiceNumber(orgPrefix, count) {
  return `${orgPrefix}-${String(count).padStart(5, '0')}`
}

// Convert Arabic-Indic (٠-٩) and Persian (۰-۹) digits to Western 0-9
export function toEnglishDigits(value) {
  if (value == null) return value
  return String(value)
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
}

// ZATCA Saudi VAT number: 15 digits, starts and ends with 3
export function isValidVatNumber(vat) {
  if (!vat) return false
  return /^3\d{13}3$/.test(String(vat).trim())
}

export function vatNumberError(vat, required = false) {
  const v = toEnglishDigits(String(vat || '').trim())
  if (!v) return required ? 'الرقم الضريبي مطلوب' : ''
  if (!/^\d+$/.test(v)) return 'الرقم الضريبي يجب أن يكون أرقامًا فقط'
  if (v.length !== 15) return 'الرقم الضريبي يجب أن يكون 15 خانة'
  if (!isValidVatNumber(v)) return 'الرقم الضريبي يجب أن يبدأ وينتهي بالرقم 3'
  return ''
}
