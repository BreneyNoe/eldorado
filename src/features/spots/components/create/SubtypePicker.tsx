import { SpotIcon } from '@/features/spots/components/SpotIcon'
import type { SpotSubtype } from '@/types/models'

interface SubtypePickerProps {
  /** Sous-catégories du type choisi, déjà filtrées et triées. */
  subtypes: SpotSubtype[]
  /** Couleur du type, pour la touche sélectionnée. */
  color: string
  value: string | null
  /** Reçoit null quand on retouche la sous-catégorie déjà choisie (si `clearable`). */
  onChange: (subtypeId: string | null) => void
  /** Permet de retirer la sous-catégorie en la touchant à nouveau. */
  clearable?: boolean
  error?: string
}

/** Choix de la sous-catégorie : une touche par sous-catégorie, avec son icône. */
export function SubtypePicker({ subtypes, color, value, onChange, clearable = false, error }: SubtypePickerProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-base font-medium">Sous-catégorie</legend>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        {subtypes.map((subtype) => {
          const selected = subtype.id === value
          return (
            <button
              key={subtype.id}
              type="button"
              onClick={() => onChange(selected && clearable ? null : subtype.id)}
              aria-pressed={selected}
              className={`flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 py-2 text-left text-base leading-snug font-semibold ${
                selected ? 'text-paper' : 'border-line bg-paper text-ink active:bg-mist'
              }`}
              style={selected ? { backgroundColor: color, borderColor: color } : undefined}
            >
              <SpotIcon name={subtype.icon} className="size-6 shrink-0" style={selected ? undefined : { color }} />
              <span>{subtype.label}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="mt-1.5 text-base text-danger">{error}</p>}
    </fieldset>
  )
}
