import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Notice } from '@/components/Notice'
import { TextField } from '@/components/TextField'
import { useSpotsLight, useSpotTypes } from '@/features/spots/hooks/useSpotQueries'
import { matchesSearch } from '@/features/spots/logic/filters'
import { sortSpots } from '@/features/spots/logic/geo'
import { extraTypesOf, typesLabel } from '@/features/spots/logic/spotTypes'

const PAGE_SIZE = 50
const LINK = 'flex h-11 items-center rounded-xl bg-mist px-4 text-base font-semibold text-ink active:bg-line'

/** Tous les spots, avec l'accès à leur fiche et à leur modification (où se trouve aussi la suppression). */
export function AdminSpots() {
  const spots = useSpotsLight()
  const types = useSpotTypes()
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const typesById = useMemo(() => new Map((types.data ?? []).map((type) => [type.id, type])), [types.data])
  const matching = useMemo(
    () => sortSpots((spots.data ?? []).filter((spot) => matchesSearch(spot.name, search)), 'name'),
    [spots.data, search],
  )

  if (spots.isPending) return <p className="text-base text-ink-soft">Chargement des spots…</p>
  if (spots.error) return <Notice tone="error">{spots.error.message}</Notice>

  return (
    <section aria-labelledby="admin-spots">
      <h2 id="admin-spots" className="text-xl font-semibold">
        {matching.length} {matching.length > 1 ? 'spots' : 'spot'}
        {search.trim() !== '' && ` sur ${spots.data.length}`}
      </h2>
      <div className="mt-3">
        <TextField
          label="Rechercher par nom"
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setLimit(PAGE_SIZE)
          }}
          autoComplete="off"
        />
      </div>

      <ul className="mt-3 divide-y divide-line border-y border-line">
        {matching.slice(0, limit).map((spot) => (
          <li key={spot.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{spot.name}</p>
              <p className="truncate text-base text-ink-soft">
                {typesLabel(typesById.get(spot.spot_type_id), extraTypesOf(spot.extra_type_ids, typesById))}
                {spot.address && ` · ${spot.address}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Link to={`/spot/${spot.id}`} className={LINK}>
                Fiche
              </Link>
              <Link to={`/spot/${spot.id}/edit`} className={LINK}>
                Modifier
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {matching.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((current) => current + PAGE_SIZE)}
          className="mt-3 h-12 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line"
        >
          Afficher plus ({matching.length - limit} restants)
        </button>
      )}
      <p className="mt-5 text-base text-ink-soft">
        La suppression d'un spot se trouve en bas de son écran « Modifier ».
      </p>
    </section>
  )
}
