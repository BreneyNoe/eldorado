import { useState } from 'react'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { avatarColor, avatarInitial } from '@/lib/avatar'
import { publicAvatarUrl } from '@/lib/storageUrls'

/** Ce qu'il faut connaître d'une personne pour dessiner son avatar. */
export interface AvatarPerson {
  display_name: string
  avatar_path?: string | null
  avatar_icon?: string | null
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
 * sur un disque dont la couleur dépend de son nom. Purement décoratif : le
 * nom est toujours écrit à côté.
 */
export function Avatar({ person, size = 'md' }: AvatarProps) {
  const dimensions = SIZES[size]
  const photoUrl = publicAvatarUrl(person?.avatar_path)
  // Photo qui n'a pas pu se charger (fichier supprimé, hors ligne) : on retombe sur l'icône ou l'initiale.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (photoUrl && failedUrl !== photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(photoUrl)}
        className={`${dimensions.box} shrink-0 rounded-full bg-mist object-cover`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimensions.box} flex shrink-0 items-center justify-center rounded-full font-semibold text-paper ${dimensions.text}`}
      style={{ backgroundColor: avatarColor(person?.display_name) }}
    >
      {person?.avatar_icon ? <SpotIcon name={person.avatar_icon} className={dimensions.icon} /> : avatarInitial(person?.display_name)}
    </span>
  )
}
