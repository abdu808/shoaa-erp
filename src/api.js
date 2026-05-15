// Thin data-access layer. Replaces Firebase. Same `{ id, ...data }` shapes
// the pages already consume. Every request is `cache: 'no-store'` so a
// financial read is ALWAYS live from the server (no stale data, ever).

const BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'shoaa_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

async function req(method, path, body) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(BASE + path, {
    method,
    headers,
    cache: 'no-store',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = null
  const txt = await res.text()
  if (txt) { try { data = JSON.parse(txt) } catch { data = txt } }
  if (!res.ok) {
    const msg = (data && data.error) || 'حدث خطأ في الخادم'
    const e = new Error(msg)
    e.status = res.status
    throw e
  }
  return data
}

const get = (p) => req('GET', p)
const post = (p, b) => req('POST', p, b ?? {})
const put = (p, b) => req('PUT', p, b ?? {})
const del = (p) => req('DELETE', p)

export const api = {
  // ---- auth ----
  login: async (email, password) => {
    const r = await post('/auth/login', { email, password })
    setToken(r.token)
    return r.user
  },
  me: () => get('/auth/me'),
  changePassword: (current, next) => post('/auth/change-password', { current, next }),
  logout: () => clearToken(),

  // ---- users ----
  listUsers: () => get('/users'),
  createUser: (data) => post('/users', data),
  deleteUser: (id) => del(`/users/${id}`),

  // ---- organizations ----
  listOrgs: () => get('/orgs'),
  getOrg: (id) => get(`/orgs/${id}`),
  saveOrg: (id, data) => (id ? put(`/orgs/${id}`, data) : post('/orgs', data)),
  deleteOrg: (id) => del(`/orgs/${id}`),

  // ---- clients ----
  listClients: () => get('/clients'),
  getClient: (id) => get(`/clients/${id}`),
  saveClient: (id, data) => (id ? put(`/clients/${id}`, data) : post('/clients', data)),
  deleteClient: (id) => del(`/clients/${id}`),

  // ---- invoices ----
  listInvoices: ({ limit = 200 } = {}) => get(`/invoices?limit=${limit}`),
  getInvoice: (id) => get(`/invoices/${id}`),
  createInvoice: (payload) => post('/invoices', payload),
  updateDraft: (id, payload) => put(`/invoices/${id}/draft`, payload),
  markPaid: (id) => post(`/invoices/${id}/pay`),
  cancelInvoice: (id) => post(`/invoices/${id}/cancel`),
  deleteInvoice: (id) => del(`/invoices/${id}`),

  // ---- backup ----
  exportBackup: () => get('/backup'),
}
