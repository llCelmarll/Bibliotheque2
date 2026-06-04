import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

interface AuditEntry {
  id: number
  actor_id: number
  action: string
  target_type: string | null
  target_id: number | null
  detail: Record<string, unknown> | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  suspend_user: 'Suspension',
  delete_user: 'Suppression',
  resolve_report: 'Signalement résolu',
  reject_report: 'Signalement rejeté',
  merge_entity: 'Fusion entité',
  change_role: 'Changement rôle',
  whitelist_add: 'Whitelist +',
  whitelist_remove: 'Whitelist -',
}

export default function AuditLog() {
  const [actionFilter, setActionFilter] = useState('')

  const { data = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit-log', actionFilter],
    queryFn: () =>
      api.get('/admin/audit-log', { params: { action: actionFilter || undefined, limit: 100 } }).then((r) => r.data),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Journal d'audit</h1>

      <select
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
        className="mb-6 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Toutes les actions</option>
        {Object.entries(ACTION_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {isLoading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Acteur</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Cible</th>
                <th className="px-4 py-3 text-left">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">User #{e.actor_id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.target_type && `${e.target_type} #${e.target_id}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {e.detail ? JSON.stringify(e.detail) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
