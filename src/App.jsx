import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/auth/Login'

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))
const Organizations = lazy(() => import('./pages/organizations/Organizations'))
const OrganizationForm = lazy(() => import('./pages/organizations/OrganizationForm'))
const Clients = lazy(() => import('./pages/clients/Clients'))
const ClientForm = lazy(() => import('./pages/clients/ClientForm'))
const Invoices = lazy(() => import('./pages/invoices/Invoices'))
const InvoiceForm = lazy(() => import('./pages/invoices/InvoiceForm'))
const InvoiceDetail = lazy(() => import('./pages/invoices/InvoiceDetail'))
const Users = lazy(() => import('./pages/users/Users'))
const Reports = lazy(() => import('./pages/reports/Reports'))
const Settings = lazy(() => import('./pages/settings/Settings'))

function PrivateRoute({ children, superAdminOnly = false }) {
  const { user, userData } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (superAdminOnly && userData?.role !== 'superadmin') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">جاري التحميل...</div>}>
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/organizations" element={<PrivateRoute superAdminOnly><Organizations /></PrivateRoute>} />
      <Route path="/organizations/new" element={<PrivateRoute superAdminOnly><OrganizationForm /></PrivateRoute>} />
      <Route path="/organizations/:id/edit" element={<PrivateRoute superAdminOnly><OrganizationForm /></PrivateRoute>} />
      <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
      <Route path="/clients/new" element={<PrivateRoute><ClientForm /></PrivateRoute>} />
      <Route path="/clients/:id/edit" element={<PrivateRoute><ClientForm /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
      <Route path="/invoices/new" element={<PrivateRoute><InvoiceForm /></PrivateRoute>} />
      <Route path="/invoices/:id/edit" element={<PrivateRoute><InvoiceForm /></PrivateRoute>} />
      <Route path="/invoices/:id" element={<PrivateRoute><InvoiceDetail /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute superAdminOnly><Users /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
