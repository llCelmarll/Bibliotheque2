import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'

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

export default function Entities() {
  const [type, setType] = useState<EntityType>('author')
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [mergeResult, setMergeResult] = useState<string | null>(null)
  const [mergeError, setMergeError] = useState<string | null>(null)

  const { data = [], isLoading } = useQuery<Entity[]>({
    queryKey: ['entities', type],
    queryFn: () => api.get(ENTITY_ENDPOINTS[type]).then((r) => r.data),
  })

  const merge = useMutation({
    mutationFn: () =>
      api.post(`/admin/entities/${type}/merge`, {
        source_id: parseInt(sourceId),
        target_id: parseInt(targetId),
      }),
    onSuccess: (res) => {
      setMergeResult(res.data.message)
      setMergeError(null)
      setSourceId('')
      setTargetId('')
    },
    onError: (err: any) => {
      setMergeError(err.response?.data?.detail ?? 'Erreur lors de la fusion.')
      setMergeResult(null)
    },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Entités globales</h1>

      <div className="flex gap-2 mb-6">
        {(Object.keys(ENTITY_LABELS) as EntityType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
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
          <h2 className="font-semibold text-gray-700 mb-3">{ENTITY_LABELS[type]} ({data.length})</h2>
          {isLoading ? (
            <p className="text-gray-400 text-sm">Chargement…</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-96 overflow-auto text-sm">
              {data.map((e) => (
                <li key={e.id} className="py-2 flex justify-between">
                  <span className="text-gray-700">{e.name}</span>
                  <span className="text-gray-400 text-xs">#{e.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fusion */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Fusion de doublons</h2>
          <p className="text-xs text-gray-500 mb-4">
            Tous les livres de la source seront migrés vers la cible, puis la source sera supprimée.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">ID source (à supprimer)</label>
              <input
                type="number"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder="ex: 42"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">ID cible (à conserver)</label>
              <input
                type="number"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="ex: 7"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => merge.mutate()}
              disabled={!sourceId || !targetId || merge.isPending}
              className="bg-orange-500 text-white rounded px-4 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors"
            >
              {merge.isPending ? 'Fusion en cours…' : 'Fusionner'}
            </button>
            {mergeResult && <p className="text-green-600 text-sm">{mergeResult}</p>}
            {mergeError && <p className="text-red-600 text-sm">{mergeError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
