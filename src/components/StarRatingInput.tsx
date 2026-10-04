import { Star } from 'lucide-react'
import { RATING_SCALE } from '@/config/constants'
import { formatRating } from '@/lib/formatRating'

interface StarRatingInputProps {
  /** Nom de ce qui est noté ("Beauté"). */
  label: string
  /** Note de 0,5 à 5 par demi-étoile, ou null si rien n'est noté. */
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

const STARS = Array.from({ length: RATING_SCALE.max }, (_, index) => index + 1)

/** "0,5 étoile", "1 étoile", "3,5 étoiles". */
function starsLabel(value: number): string {
  return `${formatRating(value)} ${value > 1 ? 'étoiles' : 'étoile'}`
}

/**
 * Saisie d'une note de 0,5 à 5 étoiles, par demi-étoile.
 *
 * Chaque étoile se touche de deux façons : sa moitié gauche donne la
 * demi-étoile, sa moitié droite l'étoile entière. Retoucher la note déjà
 * choisie la retire : noter reste facultatif.
 */
export function StarRatingInput({ label, value, onChange, disabled = false }: StarRatingInputProps) {
  const choose = (next: number) => onChange(value === next ? null : next)

  return (
    <div role="group" aria-label={label}>
      <div className="flex items-baseline justify-between gap-3">
        {/* Un libellé long ("Quantité de poissons") passe sur deux lignes plutôt que d'être coupé. */}
        <p className="min-w-0 text-base leading-snug font-medium">{label}</p>
        <p className="shrink-0 text-sm text-ink-soft">
          {value === null ? 'Non noté' : `${formatRating(value)} sur ${RATING_SCALE.max}`}
        </p>
      </div>

      <div className="mt-1 flex">
        {STARS.map((star) => {
          const half = star - 0.5
          // Part de cette étoile à colorer : rien, la moitié, ou tout.
          const fill = value === null ? 0 : value >= star ? 1 : value >= half ? 0.5 : 0
          return (
            <span key={star} className="relative flex size-12 items-center justify-center">
              <Star className="size-9 text-line" aria-hidden="true" />
              {fill > 0 && (
                <span
                  className="absolute inset-y-0 left-0 flex items-center overflow-hidden"
                  // L'étoile fait 36 px dans une case de 48 : la moitié de l'étoile s'arrête au milieu de la case.
                  style={{ width: fill === 1 ? '100%' : '50%' }}
                  aria-hidden="true"
                >
                  <Star className="ml-1.5 size-9 shrink-0 fill-blaze text-blaze-deep" strokeWidth={1.5} />
                </span>
              )}
              {/* Deux zones tactiles invisibles, une par moitié d'étoile. */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => choose(half)}
                aria-label={starsLabel(half)}
                aria-pressed={value === half}
                className="absolute inset-y-0 left-0 w-1/2 rounded-l-full active:bg-ink/10 disabled:opacity-60"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => choose(star)}
                aria-label={starsLabel(star)}
                aria-pressed={value === star}
                className="absolute inset-y-0 right-0 w-1/2 rounded-r-full active:bg-ink/10 disabled:opacity-60"
              />
            </span>
          )
        })}
      </div>
    </div>
  )
}
