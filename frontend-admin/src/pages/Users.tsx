import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import UserDrawer from '@/components/UserDrawer'

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

type SortKey = 'id' | 'email' | 'username' | 'role' | 'is_active' | 'created_at'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 20

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

function exportCSV(data: AdminUser[]) {
  const headers = ['ID', 'Email', 'Pseudo', 'Rôle', 'Statut', 'Créé le']
  const rows = data.map((u) => [
    u.id,
    u.email,
    u.username,
    ROLE_LABELS[u.role] ?? u.role,
    u.is_active ? 'Actif' : 'Suspendu',
    new Date(u.created_at).toLocaleDateString('fr-FR'),
  ])
  const csv = [headers, ...rows].map((r) => r.join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Users() {
  const qc = useQueryClient()
  const { isAdmin, user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const toast = useToast()

  const { data = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', search],
    queryFn: () =>
      api.get('/admin/users', { params: { search: search || undefined, limit: 500 } }).then((r) => r.data),
  })

  const filtered = useMemo(() => {
    let result = data
    if (roleFilter) result = result.filter((u) => u.role === roleFilter)
    if (statusFilter === 'active') result = result.filter((u) => u.is_active)
    if (statusFilter === 'suspended') result = result.filter((u) => !u.is_active)
    return [...result].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const cmp =
        typeof va === 'boolean'
          ? Number(va) - Number(vb)
          : typeof va === 'number'
          ? va - (vb as number)
          : String(va).localeCompare(String(vb), 'fr')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, roleFilter, statusFilter, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const handleSearch = (v: string) => { setSearch(v); setPage(0) }
  const handleRoleFilter = (v: string) => { setRoleFilter(v); setPage(0) }
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(0) }

  const updateUser = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      api.patch(`/admin/users/${id}`, payload),
    onSuccess: (_, { payload }) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      if ('is_active' in payload) {
        toast.success((payload as any).is_active ? 'Utilisateur réactivé.' : 'Utilisateur suspendu.')
      } else {
        toast.success('Rôle mis à jour.')
      }
    },
    onError: () => toast.error('Erreur lors de la mise à jour.'),
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Utilisateur supprimé.')
    },
    onError: () => toast.error('Erreur lors de la suppression.'),
  })

  const thClass = (key: SortKey) =>
    `px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap ${sortKey === key ? 'text-indigo-700' : 'text-gray-500'}`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Utilisateurs</h1>
        <button
          onClick={() => exportCSV(filtered)}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
        >
          ↓ Exporter CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Rechercher par email ou pseudo…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 min-w-48 max-w-sm border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tous les rôles</option>
          <option value="user">Utilisateur</option>
          <option value="moderator">Modérateur</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
        </select>
      </div>

      <p className="text-xs text-gray-400 mb-2">{filtered.length} utilisateur(s) — page {page + 1}/{pageCount}</p>

      {isLoading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase">
              <tr>
                <th className={thClass('id')} onClick={() => handleSort('id')}>
                  ID <SortIcon active={sortKey === 'id'} dir={sortDir} />
                </th>
                <th className={thClass('email')} onClick={() => handleSort('email')}>
                  Email <SortIcon active={sortKey === 'email'} dir={sortDir} />
                </th>
                <th className={thClass('username')} onClick={() => handleSort('username')}>
                  Pseudo <SortIcon active={sortKey === 'username'} dir={sortDir} />
                </th>
                <th className={thClass('role')} onClick={() => handleSort('role')}>
                  Rôle <SortIcon active={sortKey === 'role'} dir={sortDir} />
                </th>
                <th className={thClass('is_active')} onClick={() => handleSort('is_active')}>
                  Statut <SortIcon active={sortKey === 'is_active'} dir={sortDir} />
                </th>
                <th className={thClass('created_at')} onClick={() => handleSort('created_at')}>
                  Créé le <SortIcon active={sortKey === 'created_at'} dir={sortDir} />
                </th>
                <th className="px-4 py-3 text-left text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedUser(u)}>
                  <td className="px-4 py-3 text-gray-500">{u.id}</td>
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.username}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      title="Voir le détail"
                    >
                      Détail →
                    </button>
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun utilisateur.</td>
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
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 text-sm rounded ${
                      i === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
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

      <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  )
}
