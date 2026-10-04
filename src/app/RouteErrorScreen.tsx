import { useRouteError } from 'react-router'
import { Button } from '@/components/Button'
import { SheetLayout } from '@/components/SheetLayout'

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/**
 * Affiché quand un écran plante ou ne peut pas être téléchargé (par exemple
 * la carte, hors connexion). Montre le détail technique : sur un iPhone,
 * c'est le seul moyen de le lire sans ordinateur Apple.
 */
export function RouteErrorScreen() {
  const error = useRouteError()

  return (
    <SheetLayout title="Un problème est survenu">
      <p className="text-lg">
        Cet écran n'a pas pu s'afficher. Vérifie ta connexion, puis recharge l'application.
      </p>
      <pre className="mt-6 max-h-64 overflow-auto rounded-xl bg-mist p-4 text-sm break-words whitespace-pre-wrap text-ink-soft">
        {describe(error)}
        {'\n\n'}
        {navigator.userAgent}
      </pre>
      <div className="mt-6">
        <Button onClick={() => window.location.reload()}>Recharger</Button>
      </div>
    </SheetLayout>
  )
}
