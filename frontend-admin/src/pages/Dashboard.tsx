import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'

interface Stats {
  total_users: number
  active_users: number
  total_books: number
  active_loans: number
  pending_reports: number
  whitelist_count: number
}

function StatCard({
  label,
  value,
  warn,
  to,
  sublabel,
}: {
  label: string
  value: number
  warn?: boolean
  to?: string
  sublabel?: string
}) {
  const content = (
    <div
      className={`bg-white rounded-xl shadow p-6 transition-shadow ${
        warn && value > 0 ? 'border-l-4 border-orange-400' : ''
      } ${to ? 'hover:shadow-md cursor-pointer' : ''}`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${warn && value > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
        {value}
      </p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
      {to && (
        <p className="text-xs text-indigo-500 mt-2 font-medium">Voir →</p>
      )}
    </div>
  )

  if (to) return <Link to={to}>{content}</Link>
  return content
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) return <p className="text-gray-500">Chargement…</p>
  if (error) return <p className="text-red-600">Erreur lors du chargement des statistiques.</p>
  if (!data) return null

  const suspendedUsers = data.total_users - data.active_users

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
        <p className="text-xs text-gray-400">Actualisation auto toutes les 60 s</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Utilisateurs totaux"
          value={data.total_users}
          to="/users"
          sublabel={suspendedUsers > 0 ? `${suspendedUsers} suspendu(s)` : 'Tous actifs'}
        />
        <StatCard
          label="Utilisateurs actifs"
          value={data.active_users}
          to="/users?status=active"
        />
        <StatCard
          label="Livres"
          value={data.total_books}
          to="/books"
        />
        <StatCard
          label="Prêts actifs"
          value={data.active_loans}
          to="/loans"
        />
        <StatCard
          label="Signalements en attente"
          value={data.pending_reports}
          warn
          to="/reports"
          sublabel={data.pending_reports > 0 ? 'Action requise' : undefined}
        />
        <StatCard
          label="Emails whitelist"
          value={data.whitelist_count}
          to="/whitelist"
        />
      </div>

      {data.pending_reports > 0 && (
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-orange-800">
              {data.pending_reports} signalement(s) en attente de modération
            </p>
            <p className="text-sm text-orange-600 mt-0.5">Ces signalements nécessitent une action.</p>
          </div>
          <Link
            to="/reports"
            className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors whitespace-nowrap"
          >
            Traiter →
          </Link>
        </div>
      )}
    </div>
  )
}
