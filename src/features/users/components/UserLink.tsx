import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Avatar, type AvatarPerson } from '@/components/Avatar'

interface UserLinkProps {
  /** null : compte supprimé, il n'y a pas de profil à ouvrir. */
  userId: string | null | undefined
  person: AvatarPerson | null | undefined
  size?: 'sm' | 'md'
  /** Texte placé à côté de l'avatar (il contient le nom). */
  children: ReactNode
  className?: string
}

/**
 * L'avatar d'une personne et le texte qui l'accompagne. Les deux mènent à
 * son profil, sauf si le compte a été supprimé.
 */
export function UserLink({ userId, person, size = 'sm', children, className = '' }: UserLinkProps) {
  const layout = `flex min-w-0 items-center gap-2.5 ${className}`

  if (!userId || !person) {
    return (
      <span className={layout}>
        <Avatar person={person} size={size} />
        {children}
      </span>
    )
  }

  return (
    <Link
      to={`/user/${userId}`}
      aria-label={`Voir le profil de ${person.display_name}`}
      className={`${layout} rounded-lg active:opacity-70`}
    >
      <Avatar person={person} size={size} />
      {children}
    </Link>
  )
}
