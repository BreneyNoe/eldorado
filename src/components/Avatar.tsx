import { useState } from 'react'
import { AvatarOrnament } from '@/components/AvatarOrnament'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { avatarBackground, avatarInitial, avatarRank, readableOn } from '@/lib/avatar'
import { publicAvatarUrl } from '@/lib/storageUrls'

/** Ce qu'il faut connaître d'une personne pour dessiner son avatar. */
export interface AvatarPerson {
  display_name: string
  avatar_path?: string | null
  avatar_icon?: string | null
  avatar_color?: string | null
  /** Nombre de spots publiés : il donne l'ornement autour de l'avatar. */
  spot_count?: number | null
}

interface AvatarProps {
  /** null : compte supprimé. */
  person: AvatarPerson | null | undefined
  /** Diamètre : "sm" dans une ligne de texte, "md" dans une liste, "lg" sur l'écran du compte. */
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { box: 'size-7', text: 'text-sm', icon: 'size-4' },
  md: { box: 'size-10', text: 'text-lg', icon: 'size-5' },
  lg: { box: 'size-24', text: 'text-4xl', icon: 'size-12' },
}

/**
 * Avatar d'un utilisateur : sa photo, sinon son icône, sinon son initiale,
 * sur un disque de la couleur qu'il a choisie (ou tirée de son nom). À
 * partir de cinq spots publiés, un ornement l'entoure : il change à 15, 30
 * et 50 spots. Purement décoratif : le
 * nom est toujours écrit à côté.
 */
export function Avatar({ person, size = 'md' }: AvatarProps) {
  const dimensions = SIZES[size]
  const photoUrl = publicAvatarUrl(person?.avatar_path)
  // Photo qui n'a pas pu se charger (fichier supprimé, hors ligne) : on retombe sur l'icône ou l'initiale.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const rank = avatarRank(person?.spot_count)
  const background = avatarBackground(person)

  const face =
    photoUrl && failedUrl !== photoUrl ? (
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(photoUrl)}
        className="size-full rounded-full bg-mist object-cover"
      />
    ) : (
      <span
        className={`flex size-full items-center justify-center rounded-full font-semibold ${dimensions.text}`}
        style={{ backgroundColor: background, color: readableOn(background) }}
      >
        {person?.avatar_icon ? <SpotIcon name={person.avatar_icon} className={dimensions.icon} /> : avatarInitial(person?.display_name)}
      </span>
    )

  return (
    <span aria-hidden="true" className={`${dimensions.box} relative inline-flex shrink-0`}>
      {face}
      {/* L'ornement du rang entoure l'avatar, en débordant un peu, sans décaler ce qui l'entoure. */}
      {rank && <AvatarOrnament rank={rank.id} />}
    </span>
  )
}
