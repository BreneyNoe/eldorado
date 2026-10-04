import { SpotIcon } from '@/features/spots/components/SpotIcon'
import type { SpotType } from '@/types/models'

interface TypePickerProps {
  types: SpotType[]
  value: string | null
  onChange: (typeId: string) => void
  error?: string
}

/** Choix du type de spot : une grande touche par type, à sa couleur. */
export function TypePicker({ types, value, onChange, error }: TypePickerProps) {
  const activeTypes = types.filter((type) => type.is_active)

  return (
    <fieldset className="min-w-0">
      <legend className="text-base font-medium">Type de spot</legend>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        {activeTypes.map((type) => {
          const selected = type.id === value
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              aria-pressed={selected}
              className={`flex h-16 items-center gap-3 rounded-xl border-2 px-4 text-lg font-semibold ${
                selected ? 'text-paper' : 'border-line bg-paper text-ink active:bg-mist'
              }`}
              style={selected ? { backgroundColor: type.color, borderColor: type.color } : undefined}
            >
              <SpotIcon name={type.icon} className="size-6 shrink-0" style={selected ? undefined : { color: type.color }} />
              <span className="truncate">{type.label}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="mt-1.5 text-base text-danger">{error}</p>}
    </fieldset>
  )
}
