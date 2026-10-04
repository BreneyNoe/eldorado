import { useState } from 'react'
import { SpotListItem } from '@/features/spots/components/SpotListItem'
import type { SpotLight, SpotSubtype, SpotType } from '@/types/models'

/** Nombre de lignes affichées d'emblée, puis ajoutées à chaque "Afficher plus". */
const PAGE_SIZE = 30

interface SpotListProps {
  spots: SpotLight[]
  typesById: Map<string, SpotType>
  /** Sous-catégories, pour afficher celle de chaque spot. Facultatif. */
  subtypesById?: Map<string, SpotSubtype>
  onSelect: (spot: SpotLight) => void
  /** Distance à afficher pour un spot, si elle est connue. */
  distanceLabelOf?: (spot: SpotLight) => string | undefined
  /** Message affiché quand la liste est vide. */
  emptyMessage: string
}

/**
 * Liste de spots. N'affiche qu'une page à la fois : avec des milliers de
 * spots, créer toutes les lignes d'un coup figerait l'écran.
 */
export function SpotList({ spots, typesById, subtypesById, onSelect, distanceLabelOf, emptyMessage }: SpotListProps) {
  const [limit, setLimit] = useState(PAGE_SIZE)

  if (spots.length === 0) {
    return <p className="px-4 py-8 text-center text-base text-ink-soft">{emptyMessage}</p>
  }

  const visible = spots.slice(0, limit)
  const remaining = spots.length - visible.length

  return (
    <>
      <ul className="divide-y divide-line">
        {visible.map((spot) => (
          <SpotListItem
            key={spot.id}
            spot={spot}
            type={typesById.get(spot.spot_type_id)}
            subtype={spot.subtype_id ? subtypesById?.get(spot.subtype_id) : undefined}
            distanceLabel={distanceLabelOf?.(spot)}
            onSelect={onSelect}
          />
        ))}
      </ul>
      {remaining > 0 && (
        <div className="p-4">
          <button
            type="button"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
            className="h-12 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line"
          >
            Afficher {Math.min(remaining, PAGE_SIZE)} de plus ({remaining} restants)
          </button>
        </div>
      )}
    </>
  )
}
