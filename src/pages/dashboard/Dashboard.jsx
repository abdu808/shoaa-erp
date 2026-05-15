import { useEffect, useState } from 'react'
import { api } from '../../api'
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
      const [orgs, clients, invoices] = await Promise.all([
        userData?.role === 'superadmin' ? api.listOrgs() : Promise.resolve([]),
        api.listClients(),
        api.listInvoices({ limit: 100000 }),
      ])
      const totalRevenue = invoices.reduce((sum, d) => sum + (d.total || 0), 0)
      setStats({
        orgs: orgs.length,
        clients: clients.length,
        invoices: invoices.length,
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
