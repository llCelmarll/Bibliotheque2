import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useToast } from '@/components/Toast'

interface WaitlistEntry {
  id: number
  email: string
  name: string
  message: string | null
  referred_by: string | null
  status: 'pending' | 'invited' | 'rejected'
  created_at: string
}

type StatusFilter = '' | 'pending' | 'invited' | 'rejected'

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  invited: 'Invité',
  rejected: 'Rejeté',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  invited: 'bg-green-100 text-green-700',
  rejected: 'bg-gray-100 text-gray-500',
}

const FILTER_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'invited', label: 'Invité' },
  { value: 'rejected', label: 'Rejeté' },
]

const PAGE_SIZE = 20

export default function WaitlistEntries() {
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)

  const { data = [], isLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ['waitlist-entries', statusFilter],
    queryFn: () =>
      api
        .get('/admin/waitlist', {
          params: { status: statusFilter || undefined, limit: 500 },
        })
        .then((r) => r.data),
  })

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(
      (e) =>
        e.email.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.referred_by ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/waitlist/${id}`, { status }),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['waitlist-entries'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(status === 'invited' ? 'Invitation envoyée.' : 'Entrée rejetée.')
    },
    onError: () => toast.error('Erreur lors de la mise à jour.'),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Liste d'attente</h1>
      <p className="text-sm text-gray-500 mb-6">
        Personnes ayant demandé l'accès à Ma Bibliothèque. Inviter envoie automatiquement un email avec le lien d'inscription.
      </p>

      {/* Chips filtre statut */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => { setStatusFilter(chip.value); setPage(0) }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === chip.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <input
        type="text"
        placeholder="Rechercher par nom, email ou parrain…"
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
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Message</th>
                <th className="px-4 py-3 text-left">Recommandé par</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.email}</td>
                  <td
                    className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate"
                    title={e.message ?? ''}
                  >
                    {e.message ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {e.referred_by ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[e.status] ?? e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus.mutate({ id: e.id, status: 'invited' })}
                          disabled={updateStatus.isPending}
                          className="text-xs bg-green-600 text-white rounded px-2.5 py-1 hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          Inviter
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Rejeter la demande de ${e.name} (${e.email}) ?`))
                              updateStatus.mutate({ id: e.id, status: 'rejected' })
                          }}
                          disabled={updateStatus.isPending}
                          className="text-xs bg-gray-100 text-gray-600 rounded px-2.5 py-1 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Rejeter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Aucune entrée.
                  </td>
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
