import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

interface SheetLayoutProps {
  title: string
  subtitle?: string
  /** Lien de retour affiché au-dessus du titre, à la place de la balise jaune. */
  /**
   * Lien de retour. Avec `history`, il ramène à l'écran d'où l'on vient (s'il y
   * en a un), et ne suit `to` que lorsque la page a été ouverte directement.
   */
  back?: { to: string; label: string; history?: boolean }
  children: ReactNode
}

/**
 * Lien de retour. C'est un composant à part : il a besoin du routeur, alors
 * que le cadre lui-même doit pouvoir s'afficher sans lui (écran d'erreur de
 * configuration, par exemple).
 */
function BackLink({ to, label, history }: NonNullable<SheetLayoutProps['back']>) {
  const navigate = useNavigate()
  return (
    <Link
      to={to}
      onClick={(event) => {
        // "idx" compte les écrans parcourus dans l'application : au-delà de zéro, on peut revenir en arrière.
        const index = (window.history.state as { idx?: number } | null)?.idx ?? 0
        if (history && index > 0) {
          event.preventDefault()
          navigate(-1)
        }
      }}
      className="-ml-2 inline-flex h-11 items-center gap-1 rounded-lg pr-3 pl-1 text-lg text-paper/85 active:bg-paper/10"
    >
      <ChevronLeft className="size-6" aria-hidden="true" />
      {label}
    </Link>
  )
}

/**
 * Mise en page des écrans "pleine page" (connexion, compte, messages) :
 * un bandeau bleu nuit avec le titre, puis un panneau blanc arrondi qui
 * monte du bas, la même forme que les fiches de spots sur la carte.
 * Gère les marges de sécurité de l'iPhone.
 */
export function SheetLayout({ title, subtitle, back, children }: SheetLayoutProps) {
  return (
    <div className="flex min-h-full flex-col bg-ink">
      <header className="safe-top safe-x text-paper">
        <div className="mx-auto w-full max-w-md px-6 pt-8 pb-7">
          {back ? (
            <BackLink {...back} />
          ) : (
            <div className="mt-2 h-3 w-10 rounded-sm bg-blaze" aria-hidden="true" />
          )}
          <h1 className="mt-4 text-4xl leading-none font-semibold">{title}</h1>
          {subtitle && <p className="mt-3 text-lg text-paper/80">{subtitle}</p>}
        </div>
      </header>

      <main className="safe-bottom safe-x flex-1 rounded-t-3xl bg-paper">
        <div className="mx-auto w-full max-w-md px-6 pt-8 pb-10">{children}</div>
      </main>
    </div>
  )
}
