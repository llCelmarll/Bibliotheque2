import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useToast } from '@/components/Toast'

interface Report {
  id: number
  reporter_id: number
  target_type: string
  target_id: number
  reason: string
  description: string | null
  status: string
  moderator_note: string | null
  created_at: string
}

interface AdminUser {
  id: number
  email: string
  username: string
}

interface BookInfo {
  id: number
  title: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  resolved: 'Résolu',
  rejected: 'Rejeté',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-100 text-gray-600',
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Inapproprié',
  spam: 'Spam',
  wrong_info: 'Info incorrecte',
  other: 'Autre',
}

type SortKey = 'id' | 'created_at' | 'reason' | 'target_type'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 15

function exportCSV(
  data: Report[],
  userMap: Record<number, { email: string; username: string }>,
  bookMap: Record<number, string>
) {
  const headers = ['ID', 'Date', 'Reporter', 'Type cible', 'Cible', 'Raison', 'Description', 'Statut', 'Note modérateur']
  const REASON_LABELS: Record<string, string> = { inappropriate: 'Inapproprié', spam: 'Spam', wrong_info: 'Info incorrecte', other: 'Autre' }
  const STATUS_LABELS_CSV: Record<string, string> = { pending: 'En attente', resolved: 'Résolu', rejected: 'Rejeté' }
  const rows = data.map((r) => {
    const reporter = userMap[r.reporter_id]
    const bookTitle = r.target_type === 'book' ? bookMap[r.target_id] : undefined
    return [
      r.id,
      new Date(r.created_at).toLocaleDateString('fr-FR'),
      reporter ? `${reporter.username} (${reporter.email})` : `#${r.reporter_id}`,
      r.target_type,
      bookTitle ?? `#${r.target_id}`,
      REASON_LABELS[r.reason] ?? r.reason,
      r.description ?? '',
      STATUS_LABELS_CSV[r.status] ?? r.status,
      r.moderator_note ?? '',
    ]
  })
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `signalements_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const qc = useQueryClient()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [reasonFilter, setReasonFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')
  const [note, setNote] = useState<Record<number, string>>({})
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['reports', statusFilter],
    queryFn: () =>
      api
        .get('/reports', { params: { status: statusFilter || undefined, limit: 200 } })
        .then((r) => r.data),
  })

  // Charger la liste des utilisateurs pour résoudre les reporter_id
  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ['admin-users-light'],
    queryFn: () => api.get('/admin/users', { params: { limit: 500 } }).then((r) => r.data),
  })

  // Construire un index id → user
  const userMap = useMemo(() => {
    const m: Record<number, AdminUser> = {}
    users.forEach((u) => (m[u.id] = u))
    return m
  }, [users])

  // Charger les livres signalés (uniquement ceux de type "book")
  const bookIds = useMemo(() => {
    return [...new Set(reports.filter((r) => r.target_type === 'book').map((r) => r.target_id))]
  }, [reports])

  const { data: books = [] } = useQuery<BookInfo[]>({
    queryKey: ['reports-books', bookIds],
    enabled: bookIds.length > 0,
    queryFn: async () => {
      // Fetch each book title (parallel, limit 10 concurrent)
      const results = await Promise.allSettled(
        bookIds.map((id) =>
          api.get(`/books/${id}`).then((r) => ({ id: r.data.id, title: r.data.title }))
        )
      )
      return results
        .filter((r): r is PromiseFulfilledResult<BookInfo> => r.status === 'fulfilled')
        .map((r) => r.value)
    },
  })

  const bookMap = useMemo(() => {
    const m: Record<number, string> = {}
    books.forEach((b) => (m[b.id] = b.title))
    return m
  }, [books])

  const filtered = useMemo(() => {
    let result = reports
    if (reasonFilter) result = result.filter((r) => r.reason === reasonFilter)
    if (targetTypeFilter) result = result.filter((r) => r.target_type === targetTypeFilter)
    return [...result].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const cmp =
        typeof va === 'number'
          ? va - (vb as number)
          : String(va).localeCompare(String(vb), 'fr')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [reports, reasonFilter, targetTypeFilter, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const resolve = useMutation({
    mutationFn: ({ id, status, moderator_note }: { id: number; status: string; moderator_note?: string }) =>
      api.patch(`/reports/${id}`, { status, moderator_note }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(status === 'resolved' ? 'Signalement résolu.' : 'Signalement rejeté.')
    },
    onError: () => toast.error('Erreur lors du traitement du signalement.'),
  })

  const targetTypes = useMemo(() => [...new Set(reports.map((r) => r.target_type))], [reports])

  const thClass = (key: SortKey) =>
    `px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap text-xs uppercase ${sortKey === key ? 'text-indigo-700' : 'text-gray-500'}`

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span> : <span className="ml-1 text-gray-300">↕</span>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Signalements</h1>
        <button
          onClick={() => exportCSV(filtered, userMap, bookMap)}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
        >
          ↓ Exporter CSV
        </button>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['', 'pending', 'resolved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(0) }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'Tous' : STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {/* Filtres secondaires */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={reasonFilter}
          onChange={(e) => { setReasonFilter(e.target.value); setPage(0) }}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Toutes les raisons</option>
          {Object.entries(REASON_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {targetTypes.length > 1 && (
          <select
            value={targetTypeFilter}
            onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(0) }}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les types</option>
            {targetTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-2">{filtered.length} signalement(s) — page {page + 1}/{pageCount}</p>

      {isLoading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400">Aucun signalement.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className={thClass('id')} onClick={() => handleSort('id')}>
                  # <SortIcon k="id" />
                </th>
                <th className={thClass('created_at')} onClick={() => handleSort('created_at')}>
                  Date <SortIcon k="created_at" />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Reporter</th>
                <th className={thClass('target_type')} onClick={() => handleSort('target_type')}>
                  Cible <SortIcon k="target_type" />
                </th>
                <th className={thClass('reason')} onClick={() => handleSort('reason')}>
                  Raison <SortIcon k="reason" />
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((r) => {
                const reporter = userMap[r.reporter_id]
                const bookTitle = r.target_type === 'book' ? bookMap[r.target_id] : null

                return (
                  <>
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 text-xs">#{r.id}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        {reporter ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700">{reporter.username}</p>
                            <p className="text-xs text-gray-400">{reporter.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">#{r.reporter_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-xs font-medium text-gray-600 capitalize">{r.target_type}</span>
                          {bookTitle ? (
                            <p className="text-xs text-gray-500 max-w-xs truncate" title={bookTitle}>{bookTitle}</p>
                          ) : (
                            <p className="text-xs text-gray-400">#{r.target_id}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{REASON_LABELS[r.reason] ?? r.reason}</span>
                        {r.description && (
                          <p className="text-xs text-gray-400 italic max-w-xs truncate mt-0.5" title={r.description}>
                            "{r.description}"
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                        {r.moderator_note && (
                          <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate" title={r.moderator_note}>
                            Note: {r.moderator_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'pending' && (
                          <div className="flex flex-col gap-1.5 min-w-40">
                            <input
                              type="text"
                              placeholder="Note (optionnel)"
                              value={note[r.id] ?? ''}
                              onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                              className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => resolve.mutate({ id: r.id, status: 'resolved', moderator_note: note[r.id] })}
                                className="flex-1 bg-green-600 text-white rounded px-2 py-1 text-xs hover:bg-green-700"
                              >
                                Résoudre
                              </button>
                              <button
                                onClick={() => resolve.mutate({ id: r.id, status: 'rejected', moderator_note: note[r.id] })}
                                className="flex-1 bg-gray-200 text-gray-700 rounded px-2 py-1 text-xs hover:bg-gray-300"
                              >
                                Rejeter
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  </>
                )
              })}
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
              <span className="text-xs text-gray-500">{page + 1} / {pageCount}</span>
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
