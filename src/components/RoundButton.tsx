import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'

const BASE_CLASSES =
  'flex size-12 items-center justify-center rounded-full bg-paper text-ink shadow-[0_2px_8px_rgb(22_35_59/0.28)] active:bg-mist disabled:opacity-60'

interface RoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Nom de l'action, lu par les lecteurs d'écran (le bouton n'a pas de texte visible). */
  label: string
  children: ReactNode
}

/** Bouton rond flottant, posé par-dessus la carte. */
export function RoundButton({ label, children, className = '', type = 'button', ...rest }: RoundButtonProps) {
  return (
    <button type={type} aria-label={label} className={`${BASE_CLASSES} ${className}`} {...rest}>
      {children}
    </button>
  )
}

const PRIMARY_CLASSES =
  'flex size-14 items-center justify-center rounded-full bg-blaze text-ink shadow-[0_3px_10px_rgb(22_35_59/0.35)] active:bg-blaze-deep'

interface RoundLinkProps {
  to: string
  label: string
  /** "primary" : plus grand et jaune, pour l'action principale de l'écran. */
  variant?: 'default' | 'primary'
  children: ReactNode
}

/** Même apparence que RoundButton, mais mène à un autre écran. */
export function RoundLink({ to, label, variant = 'default', children }: RoundLinkProps) {
  return (
    <Link to={to} aria-label={label} className={variant === 'primary' ? PRIMARY_CLASSES : BASE_CLASSES}>
      {children}
    </Link>
  )
}
