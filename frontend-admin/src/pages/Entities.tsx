import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useToast } from '@/components/Toast'

type EntityType = 'author' | 'publisher' | 'genre' | 'series'

interface Entity {
  id: number
  name: string
}

const ENTITY_LABELS: Record<EntityType, string> = {
  author: 'Auteurs',
  publisher: 'Éditeurs',
  genre: 'Genres',
  series: 'Séries',
}

const ENTITY_ENDPOINTS: Record<EntityType, string> = {
  author: '/authors',
  publisher: '/publishers',
  genre: '/genres',
  series: '/series',
}

function EntityAutocomplete({
  entities,
  value,
  onChange,
  placeholder,
}: {
  entities: Entity[]
  value: Entity | null
  onChange: (e: Entity | null) => void
  placeholder: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) setQuery(value.name)
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const suggestions = useMemo(() => {
    if (!query.trim()) return entities.slice(0, 8)
    const q = query.toLowerCase()
    return entities.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 10)
  }, [entities, query])

  const handleSelect = (e: Entity) => {
    onChange(e)
    setQuery(e.name)
    setOpen(false)
  }

  const handleChange = (v: string) => {
    setQuery(v)
    setOpen(true)
    if (!v) onChange(null)
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {value && (
          <span className="flex items-center text-xs text-gray-400 bg-gray-100 px-2 rounded">
            #{value.id}
          </span>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto">
          {suggestions.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => handleSelect(e)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center justify-between"
              >
                <span>{e.name}</span>
                <span className="text-xs text-gray-400">#{e.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Entities() {
  const qc = useQueryClient()
  const toast = useToast()
  const [type, setType] = useState<EntityType>('author')
  const [source, setSource] = useState<Entity | null>(null)
  const [target, setTarget] = useState<Entity | null>(null)
  const [mergeResult, setMergeResult] = useState<string | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [listSearch, setListSearch] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data = [], isLoading } = useQuery<Entity[]>({
    queryKey: ['entities', type],
    queryFn: () => api.get(ENTITY_ENDPOINTS[type]).then((r) => r.data),
  })

  const filteredList = useMemo(() => {
    if (!listSearch.trim()) return data
    const q = listSearch.toLowerCase()
    return data.filter((e) => e.name.toLowerCase().includes(q))
  }, [data, listSearch])

  const merge = useMutation({
    mutationFn: () =>
      api.post(`/admin/entities/${type}/merge`, {
        source_id: source!.id,
        target_id: target!.id,
      }),
    onSuccess: (res) => {
      setMergeResult(res.data.message)
      setMergeError(null)
      setSource(null)
      setTarget(null)
      setConfirmOpen(false)
      qc.invalidateQueries({ queryKey: ['entities', type] })
      toast.success(res.data.message ?? 'Fusion effectuée.')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail ?? 'Erreur lors de la fusion.'
      setMergeError(msg)
      setMergeResult(null)
      setConfirmOpen(false)
      toast.error(msg)
    },
  })

  const handleMergeClick = () => {
    if (!source || !target) return
    if (source.id === target.id) {
      setMergeError('La source et la cible ne peuvent pas être identiques.')
      return
    }
    setMergeError(null)
    setMergeResult(null)
    setConfirmOpen(true)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Entités globales</h1>

      <div className="flex gap-2 mb-6">
        {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setSource(null); setTarget(null); setMergeResult(null); setMergeError(null) }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              type === t
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {ENTITY_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Liste */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">{ENTITY_LABELS[type]} ({data.length})</h2>
          </div>
          <input
            type="text"
            placeholder="Filtrer la liste…"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            className="w-full mb-3 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {isLoading ? (
            <p className="text-gray-400 text-sm">Chargement…</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-auto text-sm">
              {filteredList.map((e) => (
                <li
                  key={e.id}
                  className="py-2 flex justify-between items-center cursor-pointer hover:bg-gray-50 px-1 rounded"
                  onClick={() => {
                    if (!source) setSource(e)
                    else if (!target && e.id !== source.id) setTarget(e)
                  }}
                  title="Cliquer pour sélectionner comme source ou cible"
                >
                  <span className="text-gray-700">{e.name}</span>
                  <span className="text-gray-400 text-xs">#{e.id}</span>
                </li>
              ))}
              {filteredList.length === 0 && (
                <li className="py-4 text-center text-gray-400 text-sm">Aucun résultat.</li>
              )}
            </ul>
          )}
          {filteredList.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">Cliquer sur une entité pour la sélectionner</p>
          )}
        </div>

        {/* Fusion */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-1">Fusion de doublons</h2>
          <p className="text-xs text-gray-500 mb-4">
            Tous les livres de la source seront migrés vers la cible, puis la source sera supprimée.
            Sélectionnez dans la liste ou tapez pour chercher.
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Source <span className="text-red-400">(sera supprimée)</span>
              </label>
              <EntityAutocomplete
                entities={data}
                value={source}
                onChange={setSource}
                placeholder="Rechercher l'entité à supprimer…"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Cible <span className="text-green-600">(sera conservée)</span>
              </label>
              <EntityAutocomplete
                entities={data}
                value={target}
                onChange={setTarget}
                placeholder="Rechercher l'entité à conserver…"
              />
            </div>

            {source && target && source.id !== target.id && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
                <span className="font-semibold">Résumé :</span> « {source.name} » (#{source.id}) sera fusionné dans « {target.name} » (#{target.id}) et supprimé.
              </div>
            )}

            <button
              onClick={handleMergeClick}
              disabled={!source || !target || source.id === target.id || merge.isPending}
              className="bg-orange-500 text-white rounded px-4 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              {merge.isPending ? 'Fusion en cours…' : 'Fusionner'}
            </button>

            {mergeResult && (
              <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded p-2">
                ✓ {mergeResult}
              </p>
            )}
            {mergeError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                {mergeError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      {confirmOpen && source && target && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmer la fusion</h3>
            <p className="text-sm text-gray-600 mb-4">
              Cette action est <strong>irréversible</strong>. Tous les livres associés à :
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-3 text-sm">
              <span className="font-semibold text-red-700">« {source.name} »</span>
              <span className="text-gray-500"> (#{source.id})</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">seront migrés vers :</p>
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-sm">
              <span className="font-semibold text-green-700">« {target.name} »</span>
              <span className="text-gray-500"> (#{target.id})</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              L'entité source sera ensuite <strong>définitivement supprimée</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => merge.mutate()}
                disabled={merge.isPending}
                className="flex-1 px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 font-medium"
              >
                {merge.isPending ? 'Fusion…' : 'Confirmer la fusion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
