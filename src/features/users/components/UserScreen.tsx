import { Link, useParams } from 'react-router'
import { Avatar } from '@/components/Avatar'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { Notice } from '@/components/Notice'
import { SheetLayout } from '@/components/SheetLayout'
import { useCurrentUser } from '@/features/auth/hooks/AuthContext'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { useSpotsLight, useSpotTypes } from '@/features/spots/hooks/useSpotQueries'
import { UNKNOWN_TYPE_COLOR } from '@/features/spots/logic/spotIcons'
import { usePublicProfile, useUserStats } from '@/features/users/hooks/useUserProfile'
import { avatarRank, nextAvatarRank } from '@/lib/avatar'
import { formatInstantDay } from '@/lib/formatDate'

/** Nombre de spots récents listés sur un profil. */
const RECENT_SPOTS = 5

/**
 * Profil d'un utilisateur : son avatar et son ornement en grand, son rang,
 * ses chiffres, ses derniers spots. Visible par tous les membres.
 */
export function UserScreen() {
  const { userId = '' } = useParams()
  const { session } = useCurrentUser()
  const profileQuery = usePublicProfile(userId)
  const statsQuery = useUserStats(userId)
  const spots = useSpotsLight().data
  const types = useSpotTypes().data

  // On arrive ici depuis une fiche, un journal, une liste : "Retour" y ramène.
  const back = { to: '/', label: 'Retour', history: true }

  if (profileQuery.isPending) {
    // Hors ligne, sans copie de ce profil sur l'appareil : inutile d'attendre.
    if (profileQuery.fetchStatus === 'paused') {
      return (
        <SheetLayout title="Profil indisponible hors ligne" back={back}>
          <p className="text-lg">Ce profil n'a pas été consulté récemment sur cet appareil.</p>
        </SheetLayout>
      )
    }
    return <FullScreenLoader />
  }
  if (profileQuery.error) {
    return (
      <SheetLayout title="Chargement impossible" back={back}>
        <Notice tone="error">{profileQuery.error.message}</Notice>
      </SheetLayout>
    )
  }
  const profile = profileQuery.data
  if (!profile) {
    return (
      <SheetLayout title="Profil introuvable" back={back}>
        <p className="text-lg">Ce compte n'existe pas, ou a été supprimé.</p>
      </SheetLayout>
    )
  }

  const isMe = profile.id === session.userId
  // Le compteur du profil sert tout de suite ; les chiffres détaillés arrivent ensuite.
  const spotCount = statsQuery.data?.spotCount ?? profile.spot_count
  const rank = avatarRank(spotCount)
  const next = nextAvatarRank(spotCount)
  const memberSince = formatInstantDay(profile.created_at)

  const typesById = new Map((types ?? []).map((type) => [type.id, type]))
  const recent = (spots ?? [])
    .filter((spot) => spot.created_by === profile.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, RECENT_SPOTS)

  const figures = [
    { label: spotCount > 1 ? 'Spots publiés' : 'Spot publié', value: spotCount },
    { label: (statsQuery.data?.photoCount ?? 0) > 1 ? 'Photos ajoutées' : 'Photo ajoutée', value: statsQuery.data?.photoCount },
    { label: (statsQuery.data?.updateCount ?? 0) > 1 ? 'Updates publiés' : 'Update publié', value: statsQuery.data?.updateCount },
  ]

  return (
    <SheetLayout title={profile.display_name} back={back}>
      <div className="flex flex-col items-center text-center">
        <Avatar person={{ ...profile, spot_count: spotCount }} size="xl" />
        <p className="mt-4 text-2xl font-semibold">{rank ? rank.title : 'Pas encore de rang'}</p>
        <p className="text-lg text-ink-soft">
          {rank ? rank.metal : 'Le premier ornement arrive au cinquième spot publié'}
          {profile.role === 'admin' && ' · Administrateur'}
        </p>
        {memberSince && <p className="mt-1 text-base text-ink-soft">Membre depuis le {memberSince}</p>}
      </div>

      <dl aria-label="Statistiques" className="mt-8 grid grid-cols-3 gap-3">
        {figures.map((figure) => (
          <div key={figure.label} className="rounded-2xl border-2 border-line px-2 py-4 text-center">
            <dd className="text-3xl font-semibold">{figure.value ?? '…'}</dd>
            <dt className="mt-1 text-base leading-snug text-ink-soft">{figure.label}</dt>
          </div>
        ))}
      </dl>
      {statsQuery.error && (
        <div className="mt-3">
          <Notice tone="error">{statsQuery.error.message}</Notice>
        </div>
      )}

      <p className="mt-4 text-center text-base text-ink-soft">
        {next
          ? `Prochain ornement, « ${next.title} », à ${next.threshold} spots publiés.`
          : 'Tous les ornements sont obtenus.'}
      </p>

      {recent.length > 0 && (
        <section aria-labelledby="user-spots" className="mt-8 border-t border-line pt-8">
          <h2 id="user-spots" className="text-xl font-semibold">
            {isMe ? 'Tes derniers spots' : 'Ses derniers spots'}
          </h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {recent.map((spot) => {
              const type = typesById.get(spot.spot_type_id)
              return (
                <li key={spot.id}>
                  <Link to={`/spot/${spot.id}`} className="flex min-h-14 items-center gap-3 py-2 active:bg-mist">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-paper"
                      style={{ backgroundColor: type?.color ?? UNKNOWN_TYPE_COLOR }}
                      aria-hidden="true"
                    >
                      <SpotIcon name={type?.icon} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-lg font-medium">{spot.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {isMe && (
        <div className="mt-8">
          <Link
            to="/account"
            className="flex h-14 items-center justify-center rounded-xl bg-mist text-lg font-semibold text-ink active:bg-line"
          >
            Modifier mon profil
          </Link>
        </div>
      )}
    </SheetLayout>
  )
}
