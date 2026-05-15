import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import Layout from '../../components/layout/Layout'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { Building2, Users, FileText, DollarSign } from 'lucide-react'
import { formatCurrency } from '../../utils/zatca'

export default function Dashboard() {
  const { userData } = useAuth()
  const [stats, setStats] = useState({ orgs: 0, clients: 0, invoices: 0, total: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      const isSuperAdmin = userData?.role === 'superadmin'
      const orgId = userData?.orgId

      const orgsSnap = await getDocs(collection(db, 'organizations'))
      const clientsQuery = isSuperAdmin
        ? collection(db, 'clients')
        : query(collection(db, 'clients'), where('orgId', '==', orgId))
      const invoicesQuery = isSuperAdmin
        ? collection(db, 'invoices')
        : query(collection(db, 'invoices'), where('orgId', '==', orgId))

      const [clientsSnap, invoicesSnap] = await Promise.all([
        getDocs(clientsQuery),
        getDocs(invoicesQuery),
      ])

      const totalRevenue = invoicesSnap.docs.reduce((sum, d) => sum + (d.data().total || 0), 0)

      setStats({
        orgs: orgsSnap.size,
        clients: clientsSnap.size,
        invoices: invoicesSnap.size,
        total: totalRevenue,
      })
    }
    fetchStats()
  }, [userData])

  return (
    <Layout>
      <PageHeader
        title={`مرحباً، ${userData?.name || ''}`}
        subtitle="نظرة عامة على النظام"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userData?.role === 'superadmin' && (
          <StatCard title="المؤسسات" value={stats.orgs} icon={Building2} color="purple" />
        )}
        <StatCard title="العملاء" value={stats.clients} icon={Users} color="blue" />
        <StatCard title="الفواتير" value={stats.invoices} icon={FileText} color="amber" />
        <StatCard title="إجمالي الإيرادات" value={formatCurrency(stats.total)} icon={DollarSign} color="green" />
      </div>
    </Layout>
  )
}
