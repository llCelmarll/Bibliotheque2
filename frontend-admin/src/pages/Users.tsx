import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'

interface AdminUser {
  id: number
  email: string
  username: string
  role: string
  is_active: boolean
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  moderator: 'Modérateur',
  admin: 'Admin',
}

export default function Users() {
  const qc = useQueryClient()
  const { isAdmin, user: me } = useAuth()
  const [search, setSearch] = useState('')

  const { data = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', search],
    queryFn: () =>
      api.get('/admin/users', { params: { search: search || undefined, limit: 100 } }).then((r) => r.data),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      api.patch(`/admin/users/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  if (isLoading) return <p className="text-gray-500">Chargement…</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Utilisateurs</h1>

      <input
        type="text"
        placeholder="Rechercher par email ou pseudo…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-6 w-full max-w-sm border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Pseudo</th>
              <th className="px-4 py-3 text-left">Rôle</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{u.id}</td>
                <td className="px-4 py-3 font-medium">{u.email}</td>
                <td className="px-4 py-3 text-gray-600">{u.username}</td>
                <td className="px-4 py-3">
                  {isAdmin && u.id !== me?.id ? (
                    <select
                      value={u.role}
                      onChange={(e) => updateUser.mutate({ id: u.id, payload: { role: e.target.value } })}
                      className="border border-gray-200 rounded px-2 py-1 text-xs"
                    >
                      <option value="user">Utilisateur</option>
                      <option value="moderator">Modérateur</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="text-xs">{ROLE_LABELS[u.role] ?? u.role}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {u.is_active ? 'Actif' : 'Suspendu'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {u.id !== me?.id && (
                    <>
                      <button
                        onClick={() => updateUser.mutate({ id: u.id, payload: { is_active: !u.is_active } })}
                        className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                      >
                        {u.is_active ? 'Suspendre' : 'Réactiver'}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer ${u.email} définitivement ?`))
                              deleteUser.mutate(u.id)
                          }}
                          className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
