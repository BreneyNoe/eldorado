import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { UNKNOWN_TYPE_COLOR } from '@/features/spots/logic/spotIcons'
import { typesLabel } from '@/features/spots/logic/spotTypes'
import type { SpotSubtype, SpotType } from '@/types/models'

interface SpotTypeBadgeProps {
  type: SpotType | undefined
  /** Sous-catégorie du spot, s'il en a une : son icône remplace celle du type. */
  subtype?: SpotSubtype | null
  /** Types supplémentaires du spot. */
  extraTypes?: SpotType[]
}

/** Pastille colorée + nom du type (et de la sous-catégorie), reprise à l'identique du marqueur sur la carte. */
export function SpotTypeBadge({ type, subtype, extraTypes = [] }: SpotTypeBadgeProps) {
  const color = type?.color ?? UNKNOWN_TYPE_COLOR

  return (
    <span className="inline-flex items-center gap-2 text-base font-medium" style={{ color }}>
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-paper"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        <SpotIcon name={subtype?.icon ?? type?.icon} className="size-4" />
      </span>
      <span>
        {typesLabel(type, extraTypes)}
        {subtype && ` · ${subtype.label}`}
      </span>
    </span>
  )
}
