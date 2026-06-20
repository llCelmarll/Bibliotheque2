import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

interface AdminUser {
  id: number
  email: string
  username: string
  role: string
  is_active: boolean
  created_at: string
}

interface LoanItem {
  id: number
  book: { id: number; title: string; authors: { name: string }[] } | null
  contact: { first_name: string; last_name: string } | null
  loan_date: string
  due_date: string | null
  return_date: string | null
  status: string
}

interface AuditEntry {
  id: number
  action: string
  target_type: string | null
  target_id: number | null
  detail: Record<string, unknown> | null
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  moderator: 'Modérateur',
  admin: 'Admin',
}

const ROLE_COLORS: Record<string, string> = {
  user: 'bg-gray-100 text-gray-600',
  moderator: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
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

const LOAN_STATUS_COLORS: Record<string, string> = {
  active: 'text-blue-600',
  returned: 'text-green-600',
  overdue: 'text-red-600',
  lost: 'text-gray-400',
}

const LOAN_STATUS_LABELS: Record<string, string> = {
  active: 'En cours',
  returned: 'Retourné',
  overdue: 'En retard',
  lost: 'Perdu',
}

interface Props {
  user: AdminUser | null
  onClose: () => void
}

export default function UserDrawer({ user, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!user) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [user, onClose])

  const { data: loans = [], isLoading: loansLoading } = useQuery<LoanItem[]>({
    queryKey: ['user-loans', user?.id],
    enabled: !!user,
    queryFn: () => api.get(`/admin/users/${user!.id}/loans`, { params: { limit: 100 } }).then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: auditEntries = [], isLoading: auditLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit-log-user', user?.id],
    enabled: !!user,
    queryFn: () =>
      api
        .get('/admin/audit-log', { params: { limit: 50 } })
        .then((r) =>
          // Filter entries where this user is the target
          (r.data as AuditEntry[]).filter(
            (e) => e.target_type === 'user' && e.target_id === user?.id
          )
        ),
    staleTime: 30_000,
  })

  if (!user) return null

  const activeLoans  = loans.filter((l) => l.status === 'active')
  const returnedLoans = loans.filter((l) => l.status === 'returned')
  const overdueLoans = loans.filter((l) => l.status === 'overdue')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-gray-800">{user.username}</h2>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {user.is_active ? 'Actif' : 'Suspendu'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Compte créé le {new Date(user.created_at).toLocaleDateString('fr-FR')} · ID #{user.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none mt-1"
          >
            ×
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { label: 'Prêts actifs',  value: activeLoans.length,  color: 'text-blue-600' },
            { label: 'En retard',     value: overdueLoans.length, color: 'text-red-600'  },
            { label: 'Prêts total',   value: loans.length,        color: 'text-gray-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-auto p-6 space-y-6">

          {/* Prêts en cours */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              Prêts
              {loansLoading && <span className="text-xs text-gray-400 font-normal">Chargement…</span>}
            </h3>

            {loans.length === 0 && !loansLoading ? (
              <p className="text-sm text-gray-400">Aucun prêt enregistré.</p>
            ) : (
              <div className="space-y-2">
                {/* Actifs / en retard d'abord */}
                {[...activeLoans, ...overdueLoans, ...returnedLoans].slice(0, 20).map((l) => {
                  const isOverdue = l.status === 'overdue' ||
                    (l.status === 'active' && !!l.due_date && new Date(l.due_date) < new Date())
                  return (
                    <div key={l.id} className={`rounded-lg border p-3 text-sm ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate" title={l.book?.title}>
                            {l.book?.title ?? `Livre #${l.id}`}
                          </p>
                          {l.book?.authors && l.book.authors.length > 0 && (
                            <p className="text-xs text-gray-400">{l.book.authors.map((a) => a.name).join(', ')}</p>
                          )}
                          {l.contact && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              → {l.contact.first_name} {l.contact.last_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-medium ${LOAN_STATUS_COLORS[isOverdue ? 'overdue' : l.status] ?? ''}`}>
                            {isOverdue ? 'En retard' : LOAN_STATUS_LABELS[l.status] ?? l.status}
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(l.loan_date).toLocaleDateString('fr-FR')}
                          </p>
                          {l.due_date && (
                            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                              ↩ {new Date(l.due_date).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {loans.length > 20 && (
                  <p className="text-xs text-gray-400 text-center">… et {loans.length - 20} autre(s)</p>
                )}
              </div>
            )}
          </section>

          {/* Historique admin sur ce compte */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Historique admin
              {auditLoading && <span className="text-xs text-gray-400 font-normal ml-2">Chargement…</span>}
            </h3>

            {auditEntries.length === 0 && !auditLoading ? (
              <p className="text-sm text-gray-400">Aucune action admin sur ce compte.</p>
            ) : (
              <div className="space-y-2">
                {auditEntries.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 text-sm border-b border-gray-50 pb-2">
                    <div className="shrink-0 text-xs text-gray-400 w-20 text-right">
                      {new Date(e.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                      {ACTION_LABELS[e.action] ?? e.action}
                    </span>
                    {e.detail && (
                      <span className="text-xs text-gray-500 truncate">
                        {Object.entries(e.detail)
                          .filter(([, v]) => typeof v !== 'object')
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
