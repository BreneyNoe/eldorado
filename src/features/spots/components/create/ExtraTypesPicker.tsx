import { SpotIcon } from '@/features/spots/components/SpotIcon'
import type { SpotType } from '@/types/models'

interface ExtraTypesPickerProps {
  /** Types proposables : actifs, sans le type principal. */
  types: SpotType[]
  /** Ids des types supplémentaires déjà choisis. */
  value: string[]
  onChange: (typeIds: string[]) => void
}

/**
 * Types supplémentaires d'un spot : une pastille par type, que l'on coche ou
 * décoche. Le spot apparaîtra dans le filtre de chacun, et se notera sur
 * leurs catégories.
 */
export function ExtraTypesPicker({ types, value, onChange }: ExtraTypesPickerProps) {
  if (types.length === 0) return null

  const toggle = (typeId: string) =>
    onChange(value.includes(typeId) ? value.filter((id) => id !== typeId) : [...value, typeId])

  return (
    <fieldset className="min-w-0">
      <legend className="text-base font-medium">Autres types (facultatif)</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {types.map((type) => {
          const selected = value.includes(type.id)
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => toggle(type.id)}
              aria-pressed={selected}
              className={`flex h-11 items-center gap-2 rounded-full border-2 px-4 text-base font-medium ${
                selected ? 'text-paper' : 'border-line bg-paper text-ink active:bg-mist'
              }`}
              style={selected ? { backgroundColor: type.color, borderColor: type.color } : undefined}
            >
              <SpotIcon name={type.icon} className="size-4.5 shrink-0" style={selected ? undefined : { color: type.color }} />
              {type.label}
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-base text-ink-soft">
        Pour un lieu qui relève de plusieurs types : il apparaîtra dans chacun de leurs filtres.
      </p>
    </fieldset>
  )
}
