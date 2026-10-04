import { Star } from 'lucide-react'
import { RATING_SCALE } from '@/config/constants'

interface StarRatingProps {
  /** Note à afficher, entre 0 et 5. Peut être décimale (une moyenne). */
  value: number
  /** Taille des étoiles : "md" dans une fiche, "sm" dans une ligne compacte. */
  size?: 'sm' | 'md'
}

const STARS = Array.from({ length: RATING_SCALE.max }, (_, index) => index)

/**
 * Affichage d'une note en étoiles, sans interaction. Une moyenne de 4,3
 * remplit quatre étoiles et un tiers de la cinquième.
 *
 * Deux rangées d'étoiles sont superposées : des grises dessous, des jaunes
 * dessus, ces dernières étant coupées à la bonne largeur.
 */
export function StarRating({ value, size = 'md' }: StarRatingProps) {
  const clamped = Math.min(Math.max(value, 0), RATING_SCALE.max)
  const starClass = size === 'sm' ? 'size-4' : 'size-6'
  const label = `${clamped.toFixed(1).replace('.', ',')} sur ${RATING_SCALE.max}`

  return (
    <span role="img" aria-label={label} className="relative inline-flex shrink-0 align-middle">
      <span className="flex" aria-hidden="true">
        {STARS.map((star) => (
          <Star key={star} className={`${starClass} shrink-0 text-line`} />
        ))}
      </span>
      <span
        className="absolute inset-y-0 left-0 flex overflow-hidden"
        style={{ width: `${(clamped / RATING_SCALE.max) * 100}%` }}
        aria-hidden="true"
      >
        {STARS.map((star) => (
          <Star key={star} className={`${starClass} shrink-0 fill-blaze text-blaze-deep`} strokeWidth={1.5} />
        ))}
      </span>
    </span>
  )
}
