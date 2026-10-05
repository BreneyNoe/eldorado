import { useState } from 'react'
import { AvatarOrnament } from '@/components/AvatarOrnament'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { avatarBackground, avatarInitial, avatarRank, readableOn } from '@/lib/avatar'
import { ORNAMENTS, ornamentLayout } from '@/lib/ornaments'
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
  /** Diamètre : "sm" dans une ligne de texte, "md" dans une liste, "lg" sur l'écran du compte, "xl" sur un profil. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /**
   * Place de l'ornement :
   *   - "grow" (par défaut) : l'avatar garde sa taille, l'ornement s'ajoute autour ;
   *   - "contain" : le tout tient dans la taille indiquée, l'avatar rétrécit
   *     (pour un emplacement de taille fixe, comme un bouton rond).
   */
  fit?: 'grow' | 'contain'
}

/** Diamètre de l'avatar, en pixels. */
const FACE_SIZES = { sm: 28, md: 40, lg: 96, xl: 144 }

/**
 * Avatar d'un utilisateur : sa photo, sinon son icône, sinon son initiale,
 * sur un disque de la couleur qu'il a choisie (ou tirée de son nom). À
 * partir de cinq spots publiés, un ornement l'entoure ; il change à chaque
 * rang. Purement décoratif : le nom est toujours écrit à côté.
 */
export function Avatar({ person, size = 'md', fit = 'grow' }: AvatarProps) {
  const rank = avatarRank(person?.spot_count)
  const requested = FACE_SIZES[size]
  let faceSize = requested
  let boxSize = requested
  if (rank && fit === 'contain') {
    // Emplacement fixe : c'est l'avatar qui cède la place à l'ornement.
    faceSize = requested / ORNAMENTS[rank.id].scale
  } else if (rank) {
    const layout = ornamentLayout(rank.id, requested)
    faceSize = layout.face
    boxSize = layout.box
  }

  const photoUrl = publicAvatarUrl(person?.avatar_path)
  // Photo qui n'a pas pu se charger (fichier supprimé, hors ligne) : on retombe sur l'icône ou l'initiale.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const background = avatarBackground(person)

  const face =
    photoUrl && failedUrl !== photoUrl ? (
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(photoUrl)}
        className="rounded-full bg-mist object-cover"
        style={{ width: faceSize, height: faceSize }}
      />
    ) : (
      <span
        className="flex items-center justify-center rounded-full font-semibold"
        style={{
          width: faceSize,
          height: faceSize,
          fontSize: faceSize * 0.45,
          lineHeight: 1,
          backgroundColor: background,
          color: readableOn(background),
        }}
      >
        {person?.avatar_icon ? (
          <SpotIcon name={person.avatar_icon} style={{ width: faceSize * 0.52, height: faceSize * 0.52 }} />
        ) : (
          avatarInitial(person?.display_name)
        )}
      </span>
    )

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: boxSize, height: boxSize }}
    >
      {face}
      {rank && <AvatarOrnament rank={rank.id} faceSize={faceSize} />}
    </span>
  )
}
