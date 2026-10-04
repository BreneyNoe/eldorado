import { Link } from 'react-router'
import { SheetLayout } from '@/components/SheetLayout'

export function NotFoundScreen() {
  return (
    <SheetLayout title="Page introuvable">
      <p className="text-lg">Cette adresse ne correspond à aucun écran de l'application.</p>
      <Link
        to="/"
        className="mt-8 flex h-14 w-full items-center justify-center rounded-xl bg-blaze text-lg font-semibold text-ink active:bg-blaze-deep"
      >
        Revenir à l'accueil
      </Link>
    </SheetLayout>
  )
}
