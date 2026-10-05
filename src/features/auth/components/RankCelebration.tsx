import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { useAuth } from '@/features/auth/hooks/AuthContext'
import { useAcknowledgeRank } from '@/features/auth/hooks/useAuthActions'
import { avatarRank, type AvatarRank } from '@/lib/avatar'
import type { Profile } from '@/types/models'

/**
 * Annonce d'un nouveau rang.
 *
 * Elle apparaît quand le rang de l'utilisateur dépasse le dernier dont il a
 * été félicité (retenu dans son profil, donc valable sur tous ses
 * appareils). Une fois refermée, elle ne revient pas.
 */
export function RankCelebration() {
  const { state } = useAuth()
  if (state.status !== 'ready') return null

  const rank = avatarRank(state.profile.spot_count)
  if (!rank || rank.threshold <= (state.profile.rank_seen ?? 0)) return null

  // La clé repart de zéro à chaque nouveau rang : l'annonce d'un rang ne masque pas la suivante.
  return <Announcement key={rank.id} profile={state.profile} rank={rank} />
}

function Announcement({ profile, rank }: { profile: Profile; rank: AvatarRank }) {
  const acknowledge = useAcknowledgeRank(profile.id)
  // Refermée : on la masque tout de suite, même si l'enregistrement tarde ou échoue (hors ligne).
  const [closed, setClosed] = useState(false)
  if (closed) return null

  function close() {
    setClosed(true)
    acknowledge.mutate(rank.threshold)
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="rank-celebration-title"
      className="safe-bottom safe-x fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 sm:items-center"
    >
      <div className="w-full max-w-md rounded-t-3xl bg-paper px-6 pt-8 pb-6 text-center sm:rounded-3xl">
        <p className="text-base font-semibold tracking-wide text-ink-soft uppercase">Nouveau rang</p>
        <div className="mt-4 flex justify-center">
          <span className="motion-safe:animate-[rank-pop_500ms_ease-out]">
            <Avatar person={profile} size="lg" />
          </span>
        </div>
        <h2 id="rank-celebration-title" className="mt-4 text-3xl font-semibold">
          {rank.title}
        </h2>
        <p className="mt-1 text-lg text-ink-soft">
          {rank.metal} · {rank.threshold} spots publiés
        </p>
        <p className="mt-3 text-lg">Bravo ! Ton avatar porte désormais cet ornement, visible par tous les membres.</p>
        <button
          type="button"
          onClick={close}
          autoFocus
          className="mt-6 h-14 w-full rounded-xl bg-blaze text-lg font-semibold text-ink active:bg-blaze-deep"
        >
          Super !
        </button>
      </div>
      {/* Petite animation d'apparition de l'avatar, ignorée si l'appareil demande moins de mouvement. */}
      <style>{'@keyframes rank-pop { 0% { transform: scale(0.6); opacity: 0 } 70% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }'}</style>
    </div>
  )
}
