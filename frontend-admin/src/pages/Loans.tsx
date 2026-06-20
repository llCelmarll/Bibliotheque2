import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

// Livres prêtés PAR l'utilisateur à ses contacts
interface LoanItem {
  id: number
  book_id: number
  book: { id: number; title: string; authors: { name: string }[] } | null
  contact_id: number
  contact: { id: number; first_name: string; last_name: string; email: string | null } | null
  loan_date: string
  due_date: string | null
  return_date: string | null
  status: string
  notes: string | null
}

// Livres empruntés PAR l'utilisateur À quelqu'un d'autre
interface BorrowedItem {
  id: number
  book_id: number
  book: { id: number; title: string; authors: { name: string }[] } | null
  contact_id: number | null
  contact: { id: number; first_name: string; last_name: string; email: string | null } | null
  borrowed_from: string
  borrowed_date: string
  expected_return_date: string | null
  actual_return_date: string | null
  status: string
  notes: string | null
}

const LOAN_STATUS_LABELS: Record<string, string> = {
  active: 'En cours',
  returned: 'Retourné',
  overdue: 'En retard',
  lost: 'Perdu',
}

const LOAN_STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  returned: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  lost: 'bg-gray-100 text-gray-500',
}

const BORROW_STATUS_LABELS: Record<string, string> = {
  active: 'En cours',
  returned: 'Rendu',
  overdue: 'En retard',
  lost: 'Perdu',
}

type LoanSortKey = 'loan_date' | 'due_date' | 'status' | 'book_title' | 'contact_name'
type BorrowSortKey = 'borrowed_date' | 'expected_return_date' | 'status' | 'book_title' | 'borrowed_from'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

function isLoanOverdue(l: LoanItem) {
  return l.status === 'active' && !!l.due_date && new Date(l.due_date) < new Date()
}

function isBorrowOverdue(b: BorrowedItem) {
  return b.status === 'active' && !!b.expected_return_date && new Date(b.expected_return_date) < new Date()
}

function Pagination({ page, pageCount, setPage }: { page: number; pageCount: number; setPage: (p: number) => void }) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
      <button disabled={page === 0} onClick={() => setPage(page - 1)}
        className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-40">
        ← Précédent
      </button>
      <span className="text-xs text-gray-500">{page + 1} / {pageCount}</span>
      <button disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}
        className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-40">
        Suivant →
      </button>
    </div>
  )
}

function LoansTab() {
  const [statusFilter, setStatusFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<LoanSortKey>('loan_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  const { data = [], isLoading } = useQuery<LoanItem[]>({
    queryKey: ['admin-loans'],
    queryFn: () => api.get('/loans', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const overdueCount = useMemo(() => data.filter(isLoanOverdue).length, [data])

  const filtered = useMemo(() => {
    let result = data
    if (statusFilter === 'overdue') result = result.filter(isLoanOverdue)
    else if (statusFilter) result = result.filter((l) => l.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((l) => {
        const title = l.book?.title?.toLowerCase() ?? ''
        const name = `${l.contact?.first_name ?? ''} ${l.contact?.last_name ?? ''}`.toLowerCase()
        const email = l.contact?.email?.toLowerCase() ?? ''
        return title.includes(q) || name.includes(q) || email.includes(q)
      })
    }

    const val = (l: LoanItem): string => {
      switch (sortKey) {
        case 'book_title': return l.book?.title ?? ''
        case 'contact_name': return `${l.contact?.first_name ?? ''} ${l.contact?.last_name ?? ''}`.trim()
        case 'loan_date': return l.loan_date
        case 'due_date': return l.due_date ?? ''
        case 'status': return l.status
      }
    }

    return [...result].sort((a, b) => {
      const va = val(a), vb = val(b)
      if (!va && vb) return 1
      if (va && !vb) return -1
      const cmp = va.localeCompare(vb, 'fr')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, statusFilter, search, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key: LoanSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const th = (key: LoanSortKey, label: string) => (
    <th className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap text-xs uppercase ${sortKey === key ? 'text-indigo-700' : 'text-gray-500'}`}
      onClick={() => handleSort(key)}>
      {label} <SortIcon active={sortKey === key} dir={sortDir} />
    </th>
  )

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { value: '', label: 'Tous' },
          { value: 'active', label: 'En cours' },
          { value: 'overdue', label: overdueCount > 0 ? `En retard (${overdueCount})` : 'En retard' },
          { value: 'returned', label: 'Retournés' },
          { value: 'lost', label: 'Perdus' },
        ].map(({ value, label }) => (
          <button key={value} onClick={() => { setStatusFilter(value); setPage(0) }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              statusFilter === value
                ? value === 'overdue' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <input type="text" placeholder="Rechercher par livre ou emprunteur…"
        value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        className="mb-4 w-full max-w-sm border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <p className="text-xs text-gray-400 mb-2">{filtered.length} prêt(s) — page {page + 1}/{pageCount}</p>

      {isLoading ? <p className="text-gray-500">Chargement…</p> : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">ID</th>
                {th('book_title', 'Livre')}
                {th('contact_name', 'Prêté à')}
                {th('loan_date', 'Prêté le')}
                {th('due_date', 'Retour prévu')}
                {th('status', 'Statut')}
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((l) => {
                const overdue = isLoanOverdue(l)
                return (
                  <tr key={l.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{l.id}</td>
                    <td className="px-4 py-3">
                      {l.book ? (
                        <>
                          <p className="font-medium text-gray-800 max-w-[200px] truncate" title={l.book.title}>{l.book.title}</p>
                          {l.book.authors.length > 0 && <p className="text-xs text-gray-400">{l.book.authors.map((a) => a.name).join(', ')}</p>}
                        </>
                      ) : <span className="text-gray-400 text-xs">Livre #{l.book_id}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {l.contact ? (
                        <>
                          <p className="text-sm font-medium text-gray-700">{l.contact.first_name} {l.contact.last_name}</p>
                          {l.contact.email && <p className="text-xs text-gray-400">{l.contact.email}</p>}
                        </>
                      ) : <span className="text-gray-400 text-xs">Contact #{l.contact_id}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(l.loan_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {l.due_date ? (
                        <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          {new Date(l.due_date).toLocaleDateString('fr-FR')}{overdue ? ' ⚠' : ''}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${overdue ? LOAN_STATUS_COLORS.overdue : LOAN_STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {overdue ? 'En retard' : LOAN_STATUS_LABELS[l.status] ?? l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate" title={l.notes ?? ''}>{l.notes ?? '—'}</td>
                  </tr>
                )
              })}
              {pageData.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun prêt trouvé.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} pageCount={pageCount} setPage={setPage} />
        </div>
      )}
    </>
  )
}

function BorrowsTab() {
  const [statusFilter, setStatusFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<BorrowSortKey>('borrowed_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  const { data = [], isLoading } = useQuery<BorrowedItem[]>({
    queryKey: ['admin-borrowed-books'],
    queryFn: () => api.get('/borrowed-books', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const overdueCount = useMemo(() => data.filter(isBorrowOverdue).length, [data])

  const filtered = useMemo(() => {
    let result = data
    if (statusFilter === 'overdue') result = result.filter(isBorrowOverdue)
    else if (statusFilter) result = result.filter((b) => b.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((b) => {
        const title = b.book?.title?.toLowerCase() ?? ''
        const from = b.borrowed_from?.toLowerCase() ?? ''
        const contactName = b.contact ? `${b.contact.first_name} ${b.contact.last_name}`.toLowerCase() : ''
        return title.includes(q) || from.includes(q) || contactName.includes(q)
      })
    }

    const val = (b: BorrowedItem): string => {
      switch (sortKey) {
        case 'book_title': return b.book?.title ?? ''
        case 'borrowed_from': return b.contact ? `${b.contact.first_name} ${b.contact.last_name}` : b.borrowed_from
        case 'borrowed_date': return b.borrowed_date
        case 'expected_return_date': return b.expected_return_date ?? ''
        case 'status': return b.status
      }
    }

    return [...result].sort((a, b) => {
      const va = val(a), vb = val(b)
      if (!va && vb) return 1
      if (va && !vb) return -1
      const cmp = va.localeCompare(vb, 'fr')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, statusFilter, search, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key: BorrowSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const th = (key: BorrowSortKey, label: string) => (
    <th className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap text-xs uppercase ${sortKey === key ? 'text-indigo-700' : 'text-gray-500'}`}
      onClick={() => handleSort(key)}>
      {label} <SortIcon active={sortKey === key} dir={sortDir} />
    </th>
  )

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 text-sm text-blue-700">
        Livres que vous avez empruntés à vos contacts (et que vous devez rendre).
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { value: '', label: 'Tous' },
          { value: 'active', label: 'En cours' },
          { value: 'overdue', label: overdueCount > 0 ? `En retard (${overdueCount})` : 'En retard' },
          { value: 'returned', label: 'Rendus' },
        ].map(({ value, label }) => (
          <button key={value} onClick={() => { setStatusFilter(value); setPage(0) }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              statusFilter === value
                ? value === 'overdue' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <input type="text" placeholder="Rechercher par livre ou prêteur…"
        value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        className="mb-4 w-full max-w-sm border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <p className="text-xs text-gray-400 mb-2">{filtered.length} emprunt(s) — page {page + 1}/{pageCount}</p>

      {isLoading ? <p className="text-gray-500">Chargement…</p> : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">ID</th>
                {th('book_title', 'Livre')}
                {th('borrowed_from', 'Emprunté à')}
                {th('borrowed_date', 'Emprunté le')}
                {th('expected_return_date', 'À rendre avant')}
                {th('status', 'Statut')}
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((b) => {
                const overdue = isBorrowOverdue(b)
                const lenderName = b.contact
                  ? `${b.contact.first_name} ${b.contact.last_name}`
                  : b.borrowed_from

                return (
                  <tr key={b.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{b.id}</td>
                    <td className="px-4 py-3">
                      {b.book ? (
                        <>
                          <p className="font-medium text-gray-800 max-w-[200px] truncate" title={b.book.title}>{b.book.title}</p>
                          {b.book.authors.length > 0 && <p className="text-xs text-gray-400">{b.book.authors.map((a) => a.name).join(', ')}</p>}
                        </>
                      ) : <span className="text-gray-400 text-xs">Livre #{b.book_id}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-700">{lenderName}</p>
                      {b.contact?.email && <p className="text-xs text-gray-400">{b.contact.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(b.borrowed_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {b.expected_return_date ? (
                        <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          {new Date(b.expected_return_date).toLocaleDateString('fr-FR')}{overdue ? ' ⚠' : ''}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${overdue ? LOAN_STATUS_COLORS.overdue : LOAN_STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {overdue ? 'En retard' : BORROW_STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate" title={b.notes ?? ''}>{b.notes ?? '—'}</td>
                  </tr>
                )
              })}
              {pageData.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Aucun emprunt trouvé.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} pageCount={pageCount} setPage={setPage} />
        </div>
      )}
    </>
  )
}

export default function Loans() {
  const [tab, setTab] = useState<'loans' | 'borrows'>('loans')

  // Compter les retards pour afficher dans les onglets
  const { data: loans = [] } = useQuery<LoanItem[]>({
    queryKey: ['admin-loans'],
    queryFn: () => api.get('/loans', { params: { limit: 1000 } }).then((r) => r.data),
  })
  const { data: borrows = [] } = useQuery<BorrowedItem[]>({
    queryKey: ['admin-borrowed-books'],
    queryFn: () => api.get('/borrowed-books', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const loanOverdue = loans.filter(isLoanOverdue).length
  const borrowOverdue = borrows.filter(isBorrowOverdue).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Prêts & Emprunts</h1>
        {(loanOverdue + borrowOverdue) > 0 && (
          <span className="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full">
            {loanOverdue + borrowOverdue} en retard
          </span>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('loans')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'loans' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Prêts{loanOverdue > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{loanOverdue}</span>}
          <span className="ml-1 text-xs text-gray-400">({loans.length})</span>
        </button>
        <button
          onClick={() => setTab('borrows')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'borrows' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Emprunts{borrowOverdue > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{borrowOverdue}</span>}
          <span className="ml-1 text-xs text-gray-400">({borrows.length})</span>
        </button>
      </div>

      {tab === 'loans' ? <LoansTab /> : <BorrowsTab />}
    </div>
  )
}
