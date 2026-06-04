import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

interface Stats {
  total_users: number
  active_users: number
  total_books: number
  active_loans: number
  pending_reports: number
  whitelist_count: number
}

function StatCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`bg-white rounded-xl shadow p-6 ${warn && value > 0 ? 'border-l-4 border-orange-400' : ''}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  })

  if (isLoading) return <p className="text-gray-500">Chargement…</p>
  if (error) return <p className="text-red-600">Erreur lors du chargement des statistiques.</p>
  if (!data) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Utilisateurs totaux" value={data.total_users} />
        <StatCard label="Utilisateurs actifs" value={data.active_users} />
        <StatCard label="Livres" value={data.total_books} />
        <StatCard label="Prêts actifs" value={data.active_loans} />
        <StatCard label="Signalements en attente" value={data.pending_reports} warn />
        <StatCard label="Emails whitelist" value={data.whitelist_count} />
      </div>
    </div>
  )
}
