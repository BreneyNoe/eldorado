import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { StarRatingInput } from '@/components/StarRatingInput'
import { ratingChanges, type RatingRow } from '@/features/ratings/logic/ratingRows'
import type { RatingsInput } from '@/types/models'

interface RatingsEditorProps {
  rows: RatingRow[]
  /** Vrai pendant l'enregistrement. */
  busy: boolean
  error?: string | null
  /** Reçoit uniquement les catégories modifiées (null = note retirée). */
  onSave: (changes: RatingsInput) => void
  onClose: () => void
}

/**
 * Saisie de ses propres notes sur un spot, dans une fenêtre par-dessus la
 * fiche. Rien n'est enregistré avant "Enregistrer" : on peut tâtonner, ou
 * annuler, sans modifier les moyennes.
 */
export function RatingsEditor({ rows, busy, error, onSave, onClose }: RatingsEditorProps) {
  const initial = Object.fromEntries(rows.map((row) => [row.categoryId, row.mine]))
  const [values, setValues] = useState<Record<string, number | null>>(initial)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose])

  const changes = ratingChanges(initial, values)
  const hasChanges = Object.keys(changes).length > 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/60 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ratings-editor-title"
        className="safe-bottom max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-paper sm:rounded-3xl"
      >
        <div className="space-y-4 px-6 pt-6 pb-6">
          <div>
            <h2 id="ratings-editor-title" className="text-2xl leading-tight font-semibold">
              Tes notes
            </h2>
            <p className="mt-1 text-base text-ink-soft">
              Chaque catégorie est facultative. La moitié gauche d'une étoile donne une demi-étoile. Retouche ta note pour la retirer.
            </p>
          </div>

          <div className="divide-y divide-line rounded-xl border border-line px-3">
            {rows.map((row, index) => (
              <div key={row.categoryId} className="py-2">
                {row.group && row.group !== rows[index - 1]?.group && (
                  <p className="pt-1 pb-1.5 text-sm font-semibold tracking-wide text-ink-soft uppercase">{row.group}</p>
                )}
                <StarRatingInput
                  label={row.label}
                  value={values[row.categoryId] ?? null}
                  disabled={busy}
                  onChange={(value) => setValues((current) => ({ ...current, [row.categoryId]: value }))}
                />
              </div>
            ))}
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-base font-medium text-danger">
              {error}
            </p>
          )}

          <div className="space-y-3 pt-1">
            <Button loading={busy} disabled={!hasChanges} onClick={() => onSave(changes)}>
              Enregistrer mes notes
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              Annuler
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
