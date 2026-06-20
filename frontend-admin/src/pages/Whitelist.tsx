import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useToast } from '@/components/Toast'

interface WhitelistEntry {
  id: number
  email: string
  added_by_id: number | null
  added_at: string
}

type SortKey = 'email' | 'added_at'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 20

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function Whitelist() {
  const qc = useQueryClient()
  const toast = useToast()
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('added_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  const { data = [], isLoading } = useQuery<WhitelistEntry[]>({
    queryKey: ['whitelist'],
    queryFn: () => api.get('/admin/whitelist').then((r) => r.data),
  })

  const filtered = useMemo(() => {
    let result = data
    if (search) result = result.filter((e) => e.email.toLowerCase().includes(search.toLowerCase()))
    return [...result].sort((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), 'fr')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, search, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const add = useMutation({
    mutationFn: (email: string) => api.post('/admin/whitelist', { email }),
    onSuccess: (_, email) => {
      qc.invalidateQueries({ queryKey: ['whitelist'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setNewEmail('')
      setError('')
      toast.success(`${email} ajouté à la whitelist.`)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail ?? 'Erreur'
      setError(msg)
      toast.error(msg)
    },
  })

  const remove = useMutation({
    mutationFn: (email: string) => api.delete(`/admin/whitelist/${encodeURIComponent(email)}`),
    onSuccess: (_, email) => {
      qc.invalidateQueries({ queryKey: ['whitelist'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(`${email} retiré de la whitelist.`)
    },
    onError: () => toast.error('Erreur lors de la suppression.'),
  })

  const thClass = (key: SortKey) =>
    `px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap ${sortKey === key ? 'text-indigo-700' : 'text-gray-500'}`

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Whitelist</h1>
      <p className="text-sm text-gray-500 mb-6">
        Emails autorisés à créer un compte. Les domaines (@example.com) sont supportés.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && newEmail && add.mutate(newEmail)}
          placeholder="email@example.com ou @domain.com"
          className="flex-1 max-w-sm border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => add.mutate(newEmail)}
          disabled={!newEmail || add.isPending}
          className="bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <input
        type="text"
        placeholder="Rechercher dans la whitelist…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        className="mb-4 w-full max-w-sm border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <p className="text-xs text-gray-400 mb-2">{filtered.length} entrée(s)</p>

      {isLoading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase">
              <tr>
                <th className={thClass('email')} onClick={() => handleSort('email')}>
                  Email <SortIcon active={sortKey === 'email'} dir={sortDir} />
                </th>
                <th className={thClass('added_at')} onClick={() => handleSort('added_at')}>
                  Ajouté le <SortIcon active={sortKey === 'added_at'} dir={sortDir} />
                </th>
                <th className="px-4 py-3 text-left text-gray-500">Ajouté par</th>
                <th className="px-4 py-3 text-left text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium font-mono text-sm">{e.email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(e.added_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {e.added_by_id ? <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">#{e.added_by_id}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm(`Retirer ${e.email} de la whitelist ?`))
                          remove.mutate(e.email)
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Aucune entrée.</td>
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
