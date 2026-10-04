import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { UNKNOWN_TYPE_COLOR } from '@/features/spots/logic/spotIcons'
import { publicPhotoUrl } from '@/lib/storageUrls'
import type { SpotLight, SpotSubtype, SpotType } from '@/types/models'

interface SpotListItemProps {
  spot: SpotLight
  type: SpotType | undefined
  subtype?: SpotSubtype
  /** Texte affiché à droite du type ("1,2 km"). */
  distanceLabel?: string
  onSelect: (spot: SpotLight) => void
}

/** Une ligne de la liste des spots : vignette, nom, type, adresse. */
export const SpotListItem = memo(function SpotListItem({ spot, type, subtype, distanceLabel, onSelect }: SpotListItemProps) {
  const color = type?.color ?? UNKNOWN_TYPE_COLOR
  const thumbUrl = publicPhotoUrl(spot.cover_thumb_path)

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(spot)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-mist"
      >
        {/* Vignette de la photo de couverture, ou pastille du type s'il n'y a pas de photo. */}
        <span
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-paper"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        >
          {thumbUrl ? (
            <img src={thumbUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <SpotIcon name={subtype?.icon ?? type?.icon} className="size-6" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg leading-snug font-semibold">{spot.name}</span>
          <span className="block truncate text-base" style={{ color }}>
            {type?.label ?? 'Type inconnu'}
            {subtype && ` · ${subtype.label}`}
            {distanceLabel && <span className="text-ink-soft"> · {distanceLabel}</span>}
          </span>
          {spot.address && <span className="block truncate text-base text-ink-soft">{spot.address}</span>}
        </span>

        <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden="true" />
      </button>
    </li>
  )
})
