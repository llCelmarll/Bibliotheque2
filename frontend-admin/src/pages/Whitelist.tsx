import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

interface WhitelistEntry {
  id: number
  email: string
  added_by_id: number | null
  added_at: string
}

export default function Whitelist() {
  const qc = useQueryClient()
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState('')

  const { data = [], isLoading } = useQuery<WhitelistEntry[]>({
    queryKey: ['whitelist'],
    queryFn: () => api.get('/admin/whitelist').then((r) => r.data),
  })

  const add = useMutation({
    mutationFn: (email: string) => api.post('/admin/whitelist', { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whitelist'] })
      setNewEmail('')
      setError('')
    },
    onError: (err: any) => setError(err.response?.data?.detail ?? 'Erreur'),
  })

  const remove = useMutation({
    mutationFn: (email: string) => api.delete(`/admin/whitelist/${encodeURIComponent(email)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whitelist'] }),
  })

  if (isLoading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Whitelist</h1>
      <p className="text-sm text-gray-500 mb-6">
        Emails autorisés à créer un compte. Les domaines (@example.com) sont supportés.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
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

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Ajouté le</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{e.email}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(e.added_at).toLocaleDateString('fr-FR')}
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
