import { Button } from '@/components/Button'
import { SheetLayout } from '@/components/SheetLayout'
import { APP_NAME } from '@/config/constants'
import { getEnv } from '@/config/env'
import { useBackendDiagnosis } from '@/features/diagnostic/hooks/useBackendDiagnosis'
import type { BackendState } from '@/features/diagnostic/logic/classifyProbe'

type CheckStatus = 'ok' | 'failed' | 'pending'

interface Check {
  label: string
  hint: string
  status: CheckStatus
}

/** Les deux vérifications qui dépendent de la réponse de Supabase. */
function backendChecks(state: BackendState | null): { connection: CheckStatus; security: CheckStatus } {
  switch (state) {
    case null:
      return { connection: 'pending', security: 'pending' }
    case 'locked':
    case 'ready':
      return { connection: 'ok', security: 'ok' }
    case 'schema_missing':
    case 'open_to_anonymous':
      return { connection: 'ok', security: 'failed' }
    case 'unreachable':
    case 'invalid_key':
    case 'invalid_url':
    case 'unexpected':
      return { connection: 'failed', security: 'pending' }
  }
}

function StatusMark({ status }: { status: CheckStatus }) {
  if (status === 'pending') {
    return <span className="block size-3 rounded-full border-2 border-line" aria-hidden="true" />
  }
  const isOk = status === 'ok'
  return (
    <span
      className={`flex size-6 items-center justify-center rounded-full ${isOk ? 'bg-ok' : 'bg-danger'}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" className="size-3.5 fill-none stroke-paper stroke-[2.5]">
        {isOk ? <path d="M3 8.5l3.2 3L13 4.5" /> : <path d="M4 4l8 8M12 4l-8 8" />}
      </svg>
    </span>
  )
}

const STATUS_TEXT: Record<CheckStatus, string> = {
  ok: 'réussi',
  failed: 'échoué',
  pending: 'en attente',
}

export function DiagnosticScreen() {
  const env = getEnv()
  const { data: diagnosis, isFetching, refetch } = useBackendDiagnosis()

  const projectHost = new URL(env.supabaseUrl).host
  const backend = backendChecks(isFetching || !diagnosis ? null : diagnosis.state)

  const checks: Check[] = [
    { label: 'Configuration lue', hint: projectHost, status: 'ok' },
    { label: 'Supabase joignable', hint: 'Adresse et clé acceptées', status: backend.connection },
    { label: 'Base protégée', hint: 'Rien de lisible sans connexion', status: backend.security },
  ]

  return (
    <SheetLayout title={APP_NAME} subtitle="Vérification de l'installation" back={{ to: '/', label: 'Retour' }}>
      <ul className="divide-y divide-line">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-4 py-4">
            <div className="flex w-6 justify-center">
              <StatusMark status={check.status} />
            </div>
            <div className="min-w-0">
              <p className="text-lg leading-snug font-medium">
                {check.label}
                <span className="sr-only"> : {STATUS_TEXT[check.status]}</span>
              </p>
              <p className="truncate text-base text-ink-soft">{check.hint}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 min-h-24" aria-live="polite">
        {isFetching && <p className="text-base text-ink-soft">Vérification en cours…</p>}
        {!isFetching && diagnosis && (
          <>
            <p className={`text-lg leading-snug font-semibold ${diagnosis.ok ? 'text-ok' : 'text-danger'}`}>
              {diagnosis.title}
            </p>
            <p className="mt-1 text-base text-ink-soft">{diagnosis.detail}</p>
          </>
        )}
      </div>

      <div className="mt-6">
        <Button onClick={() => void refetch()} loading={isFetching}>
          Vérifier à nouveau
        </Button>
      </div>
    </SheetLayout>
  )
}
