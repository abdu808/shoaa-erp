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

// تفقيط: تحويل المبلغ إلى كلمات عربية (ريال + هللة)
function threeDigitsToWords(n) {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
    'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
    'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
    'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']
  let words = []
  const h = Math.floor(n / 100)
  const rem = n % 100
  if (h) words.push(hundreds[h])
  if (rem) {
    if (rem < 20) words.push(ones[rem])
    else {
      const o = rem % 10
      const t = Math.floor(rem / 10)
      if (o) words.push(ones[o] + ' و' + tens[t])
      else words.push(tens[t])
    }
  }
  return words.join(' و')
}

function intToArabicWords(num) {
  if (num === 0) return 'صفر'
  const scales = [
    { v: 1000000000, s: ['مليار', 'ملياران', 'مليارات'] },
    { v: 1000000, s: ['مليون', 'مليونان', 'ملايين'] },
    { v: 1000, s: ['ألف', 'ألفان', 'آلاف'] },
  ]
  let parts = []
  let rest = num
  for (const { v, s } of scales) {
    const count = Math.floor(rest / v)
    if (count) {
      if (count === 1) parts.push(s[0])
      else if (count === 2) parts.push(s[1])
      else if (count <= 10) parts.push(threeDigitsToWords(count) + ' ' + s[2])
      else parts.push(threeDigitsToWords(count) + ' ' + s[0])
      rest %= v
    }
  }
  if (rest) parts.push(threeDigitsToWords(rest))
  return parts.join(' و')
}

export function amountToArabicWords(amount) {
  const n = Math.max(0, Number(amount) || 0)
  const riyals = Math.floor(n)
  const halalas = Math.round((n - riyals) * 100)
  let out = `فقط ${intToArabicWords(riyals)} ريال`
  if (halalas > 0) out += ` و${intToArabicWords(halalas)} هللة`
  return out + ' لا غير'
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
