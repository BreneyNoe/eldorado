import { Avatar } from '@/components/Avatar'
import { AVATAR_RANKS, avatarRank, nextAvatarRank } from '@/lib/avatar'
import type { Profile } from '@/types/models'

interface RankProgressProps {
  profile: Profile
}

/**
 * Rang de l'utilisateur : où il en est, ce qui lui manque pour le suivant,
 * et l'aperçu des quatre ornements.
 */
export function RankProgress({ profile }: RankProgressProps) {
  const count = profile.spot_count ?? 0
  const current = avatarRank(count)
  const next = nextAvatarRank(count)

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Ton rang</h2>
      <p className="text-lg">
        {current ? (
          <>
            <span className="font-semibold">{current.title}</span> ({current.metal})
          </>
        ) : (
          'Pas encore de rang'
        )}
        <span className="text-ink-soft">
          {' · '}
          {count === 0 ? 'aucun spot publié' : `${count} spot${count > 1 ? 's' : ''} publié${count > 1 ? 's' : ''}`}
        </span>
      </p>
      <p className="mt-1 text-base text-ink-soft">
        {next
          ? `Encore ${next.threshold - count} spot${next.threshold - count > 1 ? 's' : ''} pour l'ornement « ${next.title} ».`
          : 'Tu as obtenu tous les ornements.'}
      </p>

      <ul aria-label="Ornements" className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6">
        {AVATAR_RANKS.map((rank) => {
          const earned = count >= rank.threshold
          return (
            <li key={rank.id} className={`flex items-center gap-4 ${earned ? '' : 'opacity-45'}`}>
              {/* Aperçu : ton avatar, entouré de l'ornement de ce rang. */}
              <span className="m-1.5 shrink-0">
                <Avatar person={{ ...profile, spot_count: rank.threshold }} size="md" />
              </span>
              <span className="min-w-0 text-base leading-snug">
                <span className="block font-semibold">{rank.title}</span>
                <span className="block text-ink-soft">
                  {rank.metal} · {rank.threshold} spots
                </span>
                <span className="block text-sm text-ink-soft">{earned ? 'Obtenu' : 'À débloquer'}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
