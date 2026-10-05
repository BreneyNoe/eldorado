import { useState } from 'react'
import { StarRating } from '@/components/StarRating'
import { RatingsEditor } from '@/features/ratings/components/RatingsEditor'
import { useSaveMyRatings, useSpotRatings } from '@/features/ratings/hooks/useSpotRatings'
import { formatAverage, formatVotes } from '@/features/ratings/logic/ratingRows'
import { formatRating } from '@/lib/formatRating'

interface RatingsSectionProps {
  spotId: string
  /** Types du spot : le principal, puis les supplémentaires. */
  spotTypeIds: string[]
  /** Utilisateur connecté : c'est sa note qui est affichée et modifiable. */
  userId: string
}

/**
 * Notes d'un spot, catégorie par catégorie : la moyenne de tous, puis la
 * note de l'utilisateur. Volontairement, aucune note globale n'est calculée.
 */
export function RatingsSection({ spotId, spotTypeIds, userId }: RatingsSectionProps) {
  const { rows, isPending, error, refetch } = useSpotRatings(spotId, spotTypeIds, userId)
  const save = useSaveMyRatings(spotId)
  const [editing, setEditing] = useState(false)

  const hasRated = rows.some((row) => row.mine !== null)

  return (
    <section aria-labelledby="spot-ratings">
      <h2 id="spot-ratings" className="text-xl font-semibold">
        Notes
      </h2>

      {error ? (
        <div className="mt-2 space-y-3">
          <p className="text-base text-danger">{error.message}</p>
          <button
            type="button"
            onClick={refetch}
            className="h-12 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line"
          >
            Réessayer
          </button>
        </div>
      ) : isPending ? (
        <p className="mt-2 text-base text-ink-soft">Chargement des notes…</p>
      ) : rows.length === 0 ? (
        <p className="mt-2 text-base text-ink-soft">Ce type de spot n'a pas de catégorie de notation.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line px-4">
            {rows.map((row, index) => (
              <li key={row.categoryId} className="py-3">
                {row.group && row.group !== rows[index - 1]?.group && (
                  <p className="pb-1.5 text-sm font-semibold tracking-wide text-ink-soft uppercase">{row.group}</p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-lg leading-snug font-medium">{row.label}</p>
                  {row.average !== null && <StarRating value={row.average} />}
                </div>
                <p className="mt-0.5 text-base text-ink-soft">
                  {row.average !== null
                    ? `${formatAverage(row.average)} · ${formatVotes(row.votes)}`
                    : 'Pas encore noté'}
                  {row.mine !== null && ` · ta note : ${formatRating(row.mine)}`}
                </p>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              save.reset()
              setEditing(true)
            }}
            className="mt-3 h-14 w-full rounded-xl bg-mist text-base font-semibold text-ink active:bg-line"
          >
            {hasRated ? 'Modifier mes notes' : 'Donner mes notes'}
          </button>
        </>
      )}

      {editing && (
        <RatingsEditor
          rows={rows}
          busy={save.isPending}
          error={save.error?.message}
          onSave={(changes) => save.mutate(changes, { onSuccess: () => setEditing(false) })}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  )
}
