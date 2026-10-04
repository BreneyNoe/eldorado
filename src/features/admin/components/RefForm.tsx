import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { TextField } from '@/components/TextField'
import { isHexColor, validateLabel } from '@/features/admin/logic/adminRules'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { isIconifyName } from '@/features/spots/logic/iconifyIcons'
import { SPOT_ICON_NAMES } from '@/features/spots/logic/spotIcons'

export interface RefValues {
  label: string
  color: string
  icon: string
  sort_order: number
  is_active: boolean
}

interface RefFormProps {
  /** Ce que l'on modifie ou crée, pour le lecteur d'écran ("Modifier le type Nature"). */
  title: string
  initial: RefValues
  /** Champs propres à ce que l'on modifie. */
  fields: {
    /** Couleur (types). */
    color?: boolean
    /** Icône d'un type : nom du jeu de base (proposé dans une liste) ou nom Iconify. */
    iconSelect?: boolean
    /** Icône Iconify à saisir (sous-catégories). */
    iconText?: boolean
  }
  busy: boolean
  error?: string | null
  onSubmit: (values: RefValues) => void
  onCancel: () => void
}

/**
 * Formulaire commun aux types, aux catégories de notes et aux
 * sous-catégories : libellé, ordre, activation, et selon le cas couleur et icône.
 */
export function RefForm({ title, initial, fields, busy, error, onSubmit, onCancel }: RefFormProps) {
  const [values, setValues] = useState<RefValues>(initial)
  const [problem, setProblem] = useState<string | null>(null)

  const set = (changes: Partial<RefValues>) => {
    setValues((current) => ({ ...current, ...changes }))
    setProblem(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const labelProblem = validateLabel(values.label)
    if (labelProblem) return setProblem(labelProblem)
    if (fields.color && !isHexColor(values.color)) return setProblem('La couleur doit être au format #RRGGBB.')
    if (fields.iconSelect && !SPOT_ICON_NAMES.includes(values.icon.trim()) && !isIconifyName(values.icon.trim())) {
      return setProblem('L\u2019icône doit être un nom de la liste, ou un nom Iconify de la forme collection:nom.')
    }
    if (fields.iconText && !isIconifyName(values.icon.trim())) {
      return setProblem('L\u2019icône doit être un nom Iconify, de la forme collection:nom.')
    }
    onSubmit({ ...values, label: values.label.trim(), icon: values.icon.trim() })
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={title} className="space-y-4 rounded-xl bg-mist p-4">
      <TextField label="Libellé" value={values.label} onChange={(event) => set({ label: event.target.value })} maxLength={40} autoComplete="off" />

      {fields.color && (
        <div>
          <label htmlFor="ref-color" className="block text-base font-medium">
            Couleur
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <input
              id="ref-color"
              type="color"
              value={isHexColor(values.color) ? values.color : '#000000'}
              onChange={(event) => set({ color: event.target.value.toUpperCase() })}
              className="h-12 w-16 shrink-0 rounded-xl border border-line bg-paper p-1"
            />
            <span className="text-lg">{values.color}</span>
          </div>
        </div>
      )}

      {fields.iconSelect && (
        <div className="flex items-end gap-3">
          <TextField
            className="min-w-0 flex-1"
            label="Icône"
            name="type_icon"
            list="ref-base-icons"
            value={values.icon}
            onChange={(event) => set({ icon: event.target.value })}
            hint="Un nom de la liste proposée, ou un nom Iconify (collection:nom)."
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <datalist id="ref-base-icons">
            {SPOT_ICON_NAMES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <SpotIcon name={values.icon.trim()} className="mb-9 size-8 shrink-0" />
        </div>
      )}

      {fields.iconText && (
        <div className="flex items-end gap-3">
          <TextField
            className="min-w-0 flex-1"
            label="Icône (nom Iconify)"
            value={values.icon}
            onChange={(event) => set({ icon: event.target.value })}
            placeholder="pinhead:flush-curb"
            hint="À choisir sur icon-sets.iconify.design."
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {isIconifyName(values.icon.trim()) && <SpotIcon name={values.icon.trim()} className="mb-9 size-8 shrink-0" />}
        </div>
      )}

      <TextField
        label="Ordre d'affichage"
        type="number"
        inputMode="numeric"
        value={String(values.sort_order)}
        onChange={(event) => set({ sort_order: Number.parseInt(event.target.value, 10) || 0 })}
        hint="Les plus petits nombres s'affichent en premier."
      />

      <label className="flex min-h-11 items-center gap-3 text-lg">
        <input
          type="checkbox"
          checked={values.is_active}
          onChange={(event) => set({ is_active: event.target.checked })}
          className="size-6"
        />
        Actif (proposé dans l'application)
      </label>

      {(problem || error) && <Notice tone="error">{problem ?? error}</Notice>}

      <div className="flex gap-3">
        <Button type="submit" loading={busy}>
          Enregistrer
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
