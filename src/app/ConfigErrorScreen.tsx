import { APP_NAME } from '@/config/constants'

interface ConfigErrorScreenProps {
  problems: string[]
}

/**
 * Affiché quand .env.local est absent ou incomplet.
 * Ne dépend ni de Supabase ni du reste de l'application.
 */
export function ConfigErrorScreen({ problems }: ConfigErrorScreenProps) {
  return (
    <main className="safe-top safe-bottom safe-x flex min-h-full flex-col bg-ink text-paper">
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <div className="h-3 w-10 rounded-sm bg-blaze" aria-hidden="true" />
        <h1 className="mt-5 text-3xl leading-tight font-semibold">
          {APP_NAME} ne peut pas démarrer
        </h1>
        <p className="mt-3 text-lg text-paper/80">La configuration est incomplète.</p>

        <ul className="mt-8 space-y-3">
          {problems.map((problem) => (
            <li key={problem} className="rounded-lg bg-paper/10 px-4 py-3 text-base">
              {problem}
            </li>
          ))}
        </ul>

        <p className="mt-8 text-base text-paper/80">
          Copie le fichier <code className="font-semibold text-paper">.env.example</code> sous le
          nom <code className="font-semibold text-paper">.env.local</code>, remplis les valeurs,
          puis relance <code className="font-semibold text-paper">npm run dev</code>.
        </p>
      </div>
    </main>
  )
}
