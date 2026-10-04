import type { ButtonHTMLAttributes, Ref } from 'react'
import { LoaderCircle } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Affiche un indicateur de chargement et désactive le bouton. */
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blaze text-ink active:bg-blaze-deep',
  secondary: 'bg-mist text-ink active:bg-line',
  danger: 'border border-line bg-paper text-danger active:bg-mist',
}

/** Bouton pleine largeur, haut de 56 px : confortable au pouce. */
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl px-5 text-lg font-semibold disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}
