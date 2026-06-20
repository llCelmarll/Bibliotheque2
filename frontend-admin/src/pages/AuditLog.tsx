import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

interface AdminUser { id: number; email: string; username: string }

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

const ACTION_COLORS: Record<string, string> = {
  suspend_user: 'bg-orange-100 text-orange-700',
  delete_user: 'bg-red-100 text-red-700',
  resolve_report: 'bg-green-100 text-green-700',
  reject_report: 'bg-gray-100 text-gray-600',
  merge_entity: 'bg-blue-100 text-blue-700',
  change_role: 'bg-purple-100 text-purple-700',
  whitelist_add: 'bg-teal-100 text-teal-700',
  whitelist_remove: 'bg-yellow-100 text-yellow-700',
}

type SortKey = 'created_at' | 'action' | 'actor_id' | 'target_type'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

function DetailCell({ detail }: { detail: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false)
  if (!detail) return <span className="text-gray-300">—</span>

  const entries = Object.entries(detail)
  const preview = entries
    .slice(0, 2)
    .map(([k, v]) => {
      if (typeof v === 'object' && v !== null) return null
      return `${k}: ${v}`
    })
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-indigo-600 hover:underline max-w-xs text-left truncate block"
        title="Voir les détails"
      >
        {preview || 'Voir détails'}
      </button>
      {open && (
        <div className="absolute z-10 left-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 max-w-sm text-xs">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          <table className="w-full">
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 last:border-0">
                  <td className="py-1 pr-3 font-medium text-gray-600 whitespace-nowrap">{k}</td>
                  <td className="py-1 text-gray-800 break-all">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
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

function exportCSV(data: AuditEntry[], userMap: Record<number, AdminUser> = {}) {
  const headers = ['ID', 'Date', 'Acteur', 'Action', 'Cible', 'Détails']
  const rows = data.map((e) => {
    const actor = userMap[e.actor_id]
    return [
    e.id,
    new Date(e.created_at).toLocaleString('fr-FR'),
    actor ? `${actor.username} (${actor.email})` : `#${e.actor_id}`,
    ACTION_LABELS[e.action] ?? e.action,
    e.target_type ? `${e.target_type} #${e.target_id}` : '',
    e.detail ? JSON.stringify(e.detail) : '',
    ]
  })
  const csv = [headers, ...rows].map((r) => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditLog() {
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  const { data = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit-log', actionFilter],
    queryFn: () =>
      api
        .get('/admin/audit-log', { params: { action: actionFilter || undefined, limit: 1000 } })
        .then((r) => r.data),
  })

  // Charger les users pour résoudre les actor_id
  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ['admin-users-light'],
    queryFn: () => api.get('/admin/users', { params: { limit: 500 } }).then((r) => r.data),
    staleTime: 5 * 60_000,
  })
  const userMap = useMemo(() => {
    const m: Record<number, AdminUser> = {}
    users.forEach((u) => (m[u.id] = u))
    return m
  }, [users])

  const filtered = useMemo(() => {
    let result = data
    if (actorFilter) {
      const id = parseInt(actorFilter)
      if (!isNaN(id)) result = result.filter((e) => e.actor_id === id)
    }
    if (dateFrom) result = result.filter((e) => new Date(e.created_at) >= new Date(dateFrom))
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((e) => new Date(e.created_at) <= to)
    }
    return [...result].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const cmp =
        typeof va === 'number'
          ? va - (vb as number)
          : String(va ?? '').localeCompare(String(vb ?? ''), 'fr')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, actorFilter, dateFrom, dateTo, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const thClass = (key: SortKey) =>
    `px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap ${sortKey === key ? 'text-indigo-700' : 'text-gray-500'}`

  const resetFilters = () => {
    setActionFilter('')
    setActorFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Journal d'audit</h1>
        <button
          onClick={() => exportCSV(filtered, userMap)}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
        >
          ↓ Exporter CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="ID acteur…"
          value={actorFilter}
          onChange={(e) => { setActorFilter(e.target.value); setPage(0) }}
          className="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Du</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
            className="border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="text-xs text-gray-500">Au</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
            className="border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {(actionFilter || actorFilter || dateFrom || dateTo) && (
          <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-gray-800 underline">
            Réinitialiser
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-2">{filtered.length} entrée(s) — page {page + 1}/{pageCount}</p>

      {isLoading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase">
              <tr>
                <th className={thClass('created_at')} onClick={() => handleSort('created_at')}>
                  Date <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
                </th>
                <th className={thClass('actor_id')} onClick={() => handleSort('actor_id')}>
                  Acteur <SortIcon active={sortKey === 'actor_id'} dir={sortDir} />
                </th>
                <th className={thClass('action')} onClick={() => handleSort('action')}>
                  Action <SortIcon active={sortKey === 'action'} dir={sortDir} />
                </th>
                <th className={thClass('target_type')} onClick={() => handleSort('target_type')}>
                  Cible <SortIcon active={sortKey === 'target_type'} dir={sortDir} />
                </th>
                <th className="px-4 py-3 text-left text-gray-500">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(e.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {userMap[e.actor_id] ? (
                      <div>
                        <p className="font-medium text-gray-700 text-xs">{userMap[e.actor_id].username}</p>
                        <p className="text-gray-400 text-xs">{userMap[e.actor_id].email}</p>
                      </div>
                    ) : (
                      <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">#{e.actor_id}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLORS[e.action] ?? 'bg-indigo-50 text-indigo-700'}`}>
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {e.target_type && (
                      <span>
                        <span className="font-medium">{e.target_type}</span>
                        {e.target_id && <span className="text-gray-400"> #{e.target_id}</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <DetailCell detail={e.detail} />
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucune entrée.</td>
                </tr>
              )}
            </tbody>
          </table>

          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-40"
              >
                ← Précédent
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => {
                  const idx = pageCount <= 10 ? i : Math.max(0, Math.min(page - 4, pageCount - 10)) + i
                  return (
                    <button
                      key={idx}
                      onClick={() => setPage(idx)}
                      className={`w-8 h-8 text-sm rounded ${
                        idx === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
              <button
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
