import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

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

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  resolved: 'Résolu',
  rejected: 'Rejeté',
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Inapproprié',
  spam: 'Spam',
  wrong_info: 'Info incorrecte',
  other: 'Autre',
}

export default function Reports() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [note, setNote] = useState<Record<number, string>>({})

  const { data = [], isLoading } = useQuery<Report[]>({
    queryKey: ['reports', statusFilter],
    queryFn: () =>
      api.get('/reports', { params: { status: statusFilter || undefined } }).then((r) => r.data),
  })

  const resolve = useMutation({
    mutationFn: ({ id, status, moderator_note }: { id: number; status: string; moderator_note?: string }) =>
      api.patch(`/reports/${id}`, { status, moderator_note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })

  if (isLoading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Signalements</h1>

      <div className="flex gap-2 mb-6">
        {['', 'pending', 'resolved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
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

      {data.length === 0 ? (
        <p className="text-gray-400">Aucun signalement.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.map((r) => (
            <div key={r.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    #{r.id} — {r.target_type} #{r.target_id}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Raison : {REASON_LABELS[r.reason] ?? r.reason} — par user #{r.reporter_id}
                  </p>
                  {r.description && (
                    <p className="text-sm text-gray-600 mt-2 italic">"{r.description}"</p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    r.status === 'pending'
                      ? 'bg-orange-100 text-orange-700'
                      : r.status === 'resolved'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>

              {r.status === 'pending' && (
                <div className="mt-4 flex gap-2 items-end">
                  <input
                    type="text"
                    placeholder="Note (optionnel)"
                    value={note[r.id] ?? ''}
                    onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => resolve.mutate({ id: r.id, status: 'resolved', moderator_note: note[r.id] })}
                    className="bg-green-600 text-white rounded px-3 py-1.5 text-sm hover:bg-green-700"
                  >
                    Résoudre
                  </button>
                  <button
                    onClick={() => resolve.mutate({ id: r.id, status: 'rejected', moderator_note: note[r.id] })}
                    className="bg-gray-200 text-gray-700 rounded px-3 py-1.5 text-sm hover:bg-gray-300"
                  >
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
