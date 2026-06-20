import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

interface BookItem {
  id: number
  owner_id: number | null
  title: string
  subtitle: string | null
  isbn: string | null
  published_date: string | null
  page_count: number | null
  cover_url: string | null
  reading_status: string | null
  rating: number | null
  notes: string | null
  created_at: string
  authors: { id: number; name: string }[]
  publisher: { id: number; name: string } | null
  genres: { id: number; name: string }[]
  series: { series: { name: string }; volume_number: number | null }[]
  current_loan: { id: number; contact: { first_name: string; last_name: string } | null } | null
  borrowed_book: { id: number; borrowed_from: string; contact: { first_name: string; last_name: string } | null } | null
}

interface GenreItem { id: number; name: string }
interface AdminUser { id: number; email: string; username: string }

const STATUS_LABELS: Record<string, string> = {
  read: 'Lu',
  unread: 'Non lu',
  in_progress: 'En cours',
}

const STATUS_COLORS: Record<string, string> = {
  read: 'bg-green-100 text-green-700',
  unread: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-100 text-blue-700',
}

const SORT_OPTIONS = [
  { value: 'id',           label: 'ID' },
  { value: 'title',        label: 'Titre' },
  { value: 'author',       label: 'Auteur' },
  { value: 'publisher',    label: 'Éditeur' },
  { value: 'genre',        label: 'Genre' },
  { value: 'published_date', label: 'Parution' },
  { value: 'page_count',   label: 'Pages' },
  { value: 'isbn',         label: 'ISBN' },
  { value: 'created_at',   label: 'Date d\'ajout' },
  { value: 'updated_at',   label: 'Modifié le' },
] as const

type SortBy = typeof SORT_OPTIONS[number]['value']

const PAGE_SIZE = 25

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span className="text-yellow-400 text-xs" title={`${rating}/5`}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function SortTh({
  col, current, order, onSort, children,
}: {
  col: SortBy; current: SortBy; order: 'asc' | 'desc'
  onSort: (c: SortBy) => void; children: React.ReactNode
}) {
  const active = current === col
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap text-xs uppercase ${active ? 'text-indigo-700' : 'text-gray-500'}`}
    >
      {children}
      <span className="ml-1">{active ? (order === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}</span>
    </th>
  )
}

// Debounce factory — returns a stable callback that delays setter calls
function useDebounced(ms = 350) {
  let timer: ReturnType<typeof setTimeout>
  return (fn: () => void) => {
    clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}

function BookDrawer({ book, userMap, onClose }: {
  book: BookItem | null
  userMap: Record<number, AdminUser>
  onClose: () => void
}) {
  useEffect(() => {
    if (!book) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [book, onClose])

  if (!book) return null

  const owner = book.owner_id ? userMap[book.owner_id] : null
  const loanedTo = book.current_loan?.contact
    ? `${book.current_loan.contact.first_name} ${book.current_loan.contact.last_name}`
    : book.current_loan ? 'Prêté' : null
  const borrowedFrom = book.borrowed_book?.contact
    ? `${book.borrowed_book.contact.first_name} ${book.borrowed_book.contact.last_name}`
    : book.borrowed_book?.borrowed_from ?? null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[440px] max-w-full bg-white shadow-2xl z-50 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-bold text-gray-800 leading-snug">{book.title}</h2>
            {book.subtitle && <p className="text-sm text-gray-500 mt-0.5">{book.subtitle}</p>}
            <p className="text-xs text-gray-400 mt-1">#{book.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Couverture */}
          {book.cover_url && (
            <div className="flex justify-center">
              <img
                src={book.cover_url}
                alt={book.title}
                className="max-h-64 object-contain rounded shadow-md"
              />
            </div>
          )}

          {/* Infos principales */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Auteur(s)</p>
              <p className="text-gray-700">
                {book.authors.length > 0 ? book.authors.map((a) => a.name).join(', ') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Éditeur</p>
              <p className="text-gray-700">{book.publisher?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Genre(s)</p>
              <p className="text-gray-700">
                {book.genres.length > 0 ? book.genres.map((g) => g.name).join(', ') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Date de parution</p>
              <p className="text-gray-700">{book.published_date ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Pages</p>
              <p className="text-gray-700">{book.page_count ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">ISBN</p>
              <p className="text-gray-700 font-mono text-xs">{book.isbn ?? '—'}</p>
            </div>
            {book.series.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Série</p>
                <p className="text-gray-700">
                  {book.series.map((s) =>
                    s.volume_number != null ? `${s.series.name} (tome ${s.volume_number})` : s.series.name
                  ).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Statut lecture + note */}
          <div className="flex items-center gap-3">
            {book.reading_status && (
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[book.reading_status] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[book.reading_status]}
              </span>
            )}
            {book.rating != null && book.rating > 0 && (
              <span className="text-sm">{'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}</span>
            )}
          </div>

          {/* Situation */}
          {(loanedTo || borrowedFrom) && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              {loanedTo && <p className="text-orange-600 font-medium">↗ Prêté à {loanedTo}</p>}
              {borrowedFrom && <p className="text-blue-600 font-medium">↙ Emprunté à {borrowedFrom}</p>}
            </div>
          )}

          {/* Notes */}
          {book.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Notes personnelles</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded p-3">{book.notes}</p>
            </div>
          )}

          {/* Métadonnées */}
          <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-y-2 text-xs text-gray-500">
            <div>
              <span className="text-gray-400">Propriétaire</span><br />
              {owner ? `${owner.username} #${book.owner_id}` : book.owner_id ? `#${book.owner_id}` : '—'}
            </div>
            <div>
              <span className="text-gray-400">Ajouté le</span><br />
              {new Date(book.created_at).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Books() {
  // Search fields
  const [titleInput, setTitleInput]         = useState('')
  const [authorInput, setAuthorInput]       = useState('')
  const [publisherInput, setPublisherInput] = useState('')
  const [genreInput, setGenreInput]         = useState('')

  // Filters (immediate)
  const [idFilter, setIdFilter]             = useState('')
  const [statusFilter, setStatusFilter]     = useState('')
  const [ratingMin, setRatingMin]           = useState('')
  const [yearMin, setYearMin]               = useState('')
  const [yearMax, setYearMax]               = useState('')
  const [lendableFilter, setLendableFilter] = useState('')
  const [ownerFilter, setOwnerFilter]       = useState('')

  // Debounced query values
  const [qTitle, setQTitle]           = useState('')
  const [qAuthor, setQAuthor]         = useState('')
  const [qPublisher, setQPublisher]   = useState('')
  const [qGenre, setQGenre]           = useState('')

  // Sort
  const [sortBy, setSortBy]       = useState<SortBy>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [page, setPage] = useState(0)
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null)

  const delay = useDebounced(350)

  const handleTitle     = (v: string) => { setTitleInput(v);     delay(() => { setQTitle(v);     setPage(0) }) }
  const handleAuthor    = (v: string) => { setAuthorInput(v);    delay(() => { setQAuthor(v);    setPage(0) }) }
  const handlePublisher = (v: string) => { setPublisherInput(v); delay(() => { setQPublisher(v); setPage(0) }) }
  const handleGenreText = (v: string) => { setGenreInput(v);     delay(() => { setQGenre(v);     setPage(0) }) }

  // Fetch genre list for dropdown
  const { data: genreList = [] } = useQuery<GenreItem[]>({
    queryKey: ['genres'],
    queryFn: () => api.get('/genres').then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  // Fetch users for owner resolution + filter dropdown
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

  const commonParams = {
    title:          qTitle        || undefined,
    author:         qAuthor       || undefined,
    publisher:      qPublisher    || undefined,
    genre:          qGenre        || undefined,
    reading_status: statusFilter  || undefined,
    rating_min:     ratingMin     ? Number(ratingMin) : undefined,
    year_min:       yearMin       ? Number(yearMin)   : undefined,
    year_max:       yearMax       ? Number(yearMax)   : undefined,
    owner_id:       ownerFilter   ? Number(ownerFilter) : undefined,
    limit:          10000,
    sort_by:        sortBy,
    sort_order:     sortOrder,
  }

  const { data = [], isLoading } = useQuery<BookItem[]>({
    queryKey: ['admin-books', qTitle, qAuthor, qPublisher, qGenre, statusFilter, ratingMin, yearMin, yearMax, sortBy, sortOrder, ownerFilter],
    queryFn: () => api.get('/admin/books', { params: commonParams }).then((r) => r.data),
  })

  // Client-side filters (id, lendable) — owner est désormais géré côté API
  const displayed = useMemo(() => {
    let result = data
    if (idFilter) result = result.filter((b) => String(b.id) === idFilter.trim())
    if (lendableFilter === 'lent')           result = result.filter((b) => !!b.current_loan)
    else if (lendableFilter === 'borrowed')  result = result.filter((b) => !!b.borrowed_book)
    else if (lendableFilter === 'available') result = result.filter((b) => !b.current_loan && !b.borrowed_book)
    return result
  }, [data, idFilter, lendableFilter])

  const pageCount = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE))
  const pageData  = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (col: SortBy) => {
    if (col === sortBy) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortOrder('asc') }
    setPage(0)
  }

  const hasFilters = idFilter || qTitle || qAuthor || qPublisher || qGenre || statusFilter || ratingMin || yearMin || yearMax || lendableFilter || ownerFilter
  const reset = () => {
    setIdFilter('')
    setTitleInput(''); setQTitle('')
    setAuthorInput(''); setQAuthor('')
    setPublisherInput(''); setQPublisher('')
    setGenreInput(''); setQGenre('')
    setStatusFilter(''); setRatingMin('')
    setYearMin(''); setYearMax('')
    setLendableFilter(''); setOwnerFilter(''); setPage(0)
  }

  const lentCount      = data.filter((b) => !!b.current_loan).length
  const borrowedCount  = data.filter((b) => !!b.borrowed_book).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Livres</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {lentCount > 0 && <span className="text-orange-600 font-medium">{lentCount} prêté(s)</span>}
          {borrowedCount > 0 && <span className="text-blue-600 font-medium">{borrowedCount} emprunté(s)</span>}
          <span>{data.length} résultat(s)</span>
        </div>
      </div>

      {/* Panneau de filtres */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
        {/* Ligne 1 : recherches texte */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">ID</label>
            <input type="number" value={idFilter} onChange={(e) => { setIdFilter(e.target.value); setPage(0) }}
              placeholder="Ex: 42"
              className="w-24 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Titre</label>
            <input value={titleInput} onChange={(e) => handleTitle(e.target.value)}
              placeholder="Rechercher…"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Auteur</label>
            <input value={authorInput} onChange={(e) => handleAuthor(e.target.value)}
              placeholder="Rechercher…"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Éditeur</label>
            <input value={publisherInput} onChange={(e) => handlePublisher(e.target.value)}
              placeholder="Rechercher…"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Genre</label>
            {genreList.length > 0 ? (
              <select value={genreInput}
                onChange={(e) => { setGenreInput(e.target.value); setQGenre(e.target.value); setPage(0) }}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Tous</option>
                {genreList.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            ) : (
              <input value={genreInput} onChange={(e) => handleGenreText(e.target.value)}
                placeholder="Rechercher…"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            )}
          </div>
        </div>

        {/* Ligne 2 : filtres secondaires */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Statut de lecture</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Tous</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Note minimale</label>
            <select value={ratingMin} onChange={(e) => { setRatingMin(e.target.value); setPage(0) }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Toutes</option>
              <option value="1">★ et +</option>
              <option value="2">★★ et +</option>
              <option value="3">★★★ et +</option>
              <option value="4">★★★★ et +</option>
              <option value="5">★★★★★ seulement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Année publiée</label>
            <div className="flex items-center gap-1">
              <input type="number" value={yearMin} onChange={(e) => { setYearMin(e.target.value); setPage(0) }}
                placeholder="De" min="1000" max="2099"
                className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <span className="text-gray-400 text-xs">–</span>
              <input type="number" value={yearMax} onChange={(e) => { setYearMax(e.target.value); setPage(0) }}
                placeholder="À" min="1000" max="2099"
                className="w-20 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Situation</label>
            <select value={lendableFilter} onChange={(e) => { setLendableFilter(e.target.value); setPage(0) }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Tous</option>
              <option value="lent">Prêtés à quelqu'un</option>
              <option value="borrowed">Empruntés à quelqu'un</option>
              <option value="available">Disponibles</option>
            </select>
          </div>

          {users.length > 1 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Propriétaire</label>
              <select value={ownerFilter} onChange={(e) => { setOwnerFilter(e.target.value); setPage(0) }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Tous</option>
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.username} #{u.id}</option>
                ))}
              </select>
            </div>
          )}

          <div className="ml-auto flex items-end gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Trier par</label>
              <div className="flex gap-1">
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(0) }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button onClick={() => { setSortOrder((o) => o === 'asc' ? 'desc' : 'asc'); setPage(0) }}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm hover:bg-gray-50 whitespace-nowrap">
                  {sortOrder === 'asc' ? '↑ Croissant' : '↓ Décroissant'}
                </button>
              </div>
            </div>
            {hasFilters && (
              <button onClick={reset} className="pb-1 text-xs text-gray-500 hover:text-gray-800 underline">
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-2">{displayed.length} livre(s) — page {page + 1}/{pageCount}</p>

      {isLoading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <SortTh col="id"             current={sortBy} order={sortOrder} onSort={handleSort}>ID</SortTh>
                <SortTh col="title"          current={sortBy} order={sortOrder} onSort={handleSort}>Titre</SortTh>
                <SortTh col="author"         current={sortBy} order={sortOrder} onSort={handleSort}>Auteur(s)</SortTh>
                <SortTh col="publisher"      current={sortBy} order={sortOrder} onSort={handleSort}>Éditeur</SortTh>
                <SortTh col="genre"          current={sortBy} order={sortOrder} onSort={handleSort}>Genre</SortTh>
                <SortTh col="published_date" current={sortBy} order={sortOrder} onSort={handleSort}>Année</SortTh>
                <SortTh col="page_count"     current={sortBy} order={sortOrder} onSort={handleSort}>Pages</SortTh>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Note</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Propriétaire</th>
                <SortTh col="created_at" current={sortBy} order={sortOrder} onSort={handleSort}>Ajouté le</SortTh>
                <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Situation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.map((b) => {
                const loanedTo = b.current_loan?.contact
                  ? `${b.current_loan.contact.first_name} ${b.current_loan.contact.last_name}`
                  : b.current_loan ? 'Prêté' : null
                const borrowedFrom = b.borrowed_book?.contact
                  ? `${b.borrowed_book.contact.first_name} ${b.borrowed_book.contact.last_name}`
                  : b.borrowed_book?.borrowed_from ?? null

                return (
                  <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedBook(b)}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{b.id}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-medium text-gray-800 truncate" title={b.title}>{b.title}</p>
                      {b.isbn && <p className="text-xs text-gray-400 font-mono">{b.isbn}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[130px]">
                      {b.authors.length > 0
                        ? <span title={b.authors.map((a) => a.name).join(', ')} className="truncate block">{b.authors.map((a) => a.name).join(', ')}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {b.publisher?.name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {b.genres.length > 0
                        ? <span title={b.genres.map((g) => g.name).join(', ')}>
                            {b.genres[0].name}{b.genres.length > 1 ? <span className="text-gray-400"> +{b.genres.length - 1}</span> : ''}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {b.published_date ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{b.page_count ?? '—'}</td>
                    <td className="px-4 py-3"><Stars rating={b.rating} /></td>
                    <td className="px-4 py-3">
                      {b.reading_status ? (
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[b.reading_status]}`}>
                          {STATUS_LABELS[b.reading_status]}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {b.owner_id && userMap[b.owner_id]
                        ? <span title={userMap[b.owner_id].email}>
                            {userMap[b.owner_id].username}
                            <span className="text-gray-400 font-mono ml-1">#{b.owner_id}</span>
                          </span>
                        : b.owner_id
                        ? <span className="text-gray-400 font-mono">#{b.owner_id}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {loanedTo   ? <span className="text-orange-600 font-medium" title="Prêté à">↗ {loanedTo}</span>
                      : borrowedFrom ? <span className="text-blue-600 font-medium" title="Emprunté à">↙ {borrowedFrom}</span>
                      : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-400">Aucun livre trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>

          {pageCount > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-40">
                ← Précédent
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(pageCount, 10) }, (_, i) => {
                  const idx = pageCount <= 10 ? i : Math.max(0, Math.min(page - 4, pageCount - 10)) + i
                  return (
                    <button key={idx} onClick={() => setPage(idx)}
                      className={`w-8 h-8 text-sm rounded ${idx === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
              <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}
                className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-40">
                Suivant →
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400 flex gap-4">
        <span><span className="text-orange-600">↗</span> Prêté à quelqu'un</span>
        <span><span className="text-blue-600">↙</span> Emprunté à quelqu'un</span>
      </div>

      <BookDrawer book={selectedBook} userMap={userMap} onClose={() => setSelectedBook(null)} />
    </div>
  )
}
