import { SpotIcon } from '@/features/spots/components/SpotIcon'
import type { SpotSubtype } from '@/types/models'

interface SubtypePickerProps {
  /** Sous-catégories des types du spot (précisions comprises), déjà filtrées et triées. */
  subtypes: SpotSubtype[]
  /** Couleur du type, pour la touche sélectionnée. */
  color: string
  value: string | null
  /** Reçoit null quand on retouche la sous-catégorie déjà choisie (si `clearable`). */
  onChange: (subtypeId: string | null) => void
  /** Permet de retirer la sous-catégorie en la touchant à nouveau. */
  clearable?: boolean
  /** Vrai si aucune sous-catégorie n'est obligatoire : ce sont alors des options que l'on coche. */
  optional?: boolean
  error?: string
}

const CHOICE =
  'flex min-h-16 items-center gap-3 rounded-xl border-2 px-4 py-2 text-left text-base leading-snug font-semibold'

/**
 * Choix de la sous-catégorie : une touche par sous-catégorie, avec son icône.
 *
 * Une sous-catégorie peut avoir des précisions ("Bivouac" : "Tente" ou
 * "Hamac"). Elles apparaissent dessous une fois la sous-catégorie choisie,
 * et restent facultatives : le spot porte alors soit "Bivouac", soit, plus
 * précisément, "Tente" ou "Hamac".
 */
export function SubtypePicker({ subtypes, color, value, onChange, clearable = false, optional = false, error }: SubtypePickerProps) {
  const mains = subtypes.filter((subtype) => !subtype.parent_id)
  const current = subtypes.find((subtype) => subtype.id === value)
  // La sous-catégorie choisie : elle-même, ou celle que la précision choisie précise.
  const selectedMainId = current?.parent_id ?? current?.id ?? null
  const selectedMain = mains.find((subtype) => subtype.id === selectedMainId)
  const details = selectedMain ? subtypes.filter((subtype) => subtype.parent_id === selectedMain.id) : []
  const canClear = clearable || optional

  const style = (selected: boolean) => (selected ? { backgroundColor: color, borderColor: color } : undefined)
  const look = (selected: boolean) => `${CHOICE} ${selected ? 'text-paper' : 'border-line bg-paper text-ink active:bg-mist'}`

  return (
    <fieldset className="min-w-0">
      <legend className="text-base font-medium">{optional ? 'Options (facultatif)' : 'Sous-catégorie'}</legend>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        {mains.map((subtype) => {
          const selected = subtype.id === selectedMainId
          return (
            <button
              key={subtype.id}
              type="button"
              // Retoucher la sous-catégorie choisie la retire, précision comprise.
              onClick={() => onChange(selected && canClear ? null : subtype.id)}
              aria-pressed={selected}
              className={look(selected)}
              style={style(selected)}
            >
              <SpotIcon name={subtype.icon} className="size-6 shrink-0" style={selected ? undefined : { color }} />
              <span>{subtype.label}</span>
            </button>
          )
        })}
      </div>

      {selectedMain && details.length > 0 && (
        <div role="group" aria-label={`Précision : ${selectedMain.label}`} className="mt-3 border-l-4 border-line pl-3">
          <p className="text-base text-ink-soft">{selectedMain.label} : précise si tu veux</p>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            {details.map((detail) => {
              const selected = detail.id === value
              return (
                <button
                  key={detail.id}
                  type="button"
                  // Retoucher la précision choisie revient à la sous-catégorie seule.
                  onClick={() => onChange(selected ? selectedMain.id : detail.id)}
                  aria-pressed={selected}
                  className={look(selected)}
                  style={style(selected)}
                >
                  <SpotIcon name={detail.icon} className="size-6 shrink-0" style={selected ? undefined : { color }} />
                  <span>{detail.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-base text-danger">{error}</p>}
    </fieldset>
  )
}
