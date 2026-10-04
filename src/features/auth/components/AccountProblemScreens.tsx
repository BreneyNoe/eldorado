import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { SheetLayout } from '@/components/SheetLayout'
import { useAuth } from '@/features/auth/hooks/AuthContext'
import { useSignOut } from '@/features/auth/hooks/useAuthActions'
import type { AppError } from '@/lib/errors'

function SignOutButton() {
  const signOut = useSignOut()
  return (
    <div className="space-y-3">
      {signOut.error && <Notice tone="error">{signOut.error.message}</Notice>}
      <Button variant="secondary" loading={signOut.isPending} onClick={() => signOut.mutate()}>
        Se déconnecter
      </Button>
    </div>
  )
}

interface AccountBlockedScreenProps {
  email: string
  reason: 'disabled' | 'no_profile'
}

/** Compte désactivé par un admin, ou compte sans profil. */
export function AccountBlockedScreen({ email, reason }: AccountBlockedScreenProps) {
  const { reloadProfile } = useAuth()
  return (
    <SheetLayout title={reason === 'disabled' ? 'Accès retiré' : 'Compte incomplet'}>
      <p className="text-lg">
        {reason === 'disabled'
          ? "Un administrateur a retiré l'accès de ce compte. Tu ne peux plus consulter ni ajouter de spots."
          : "Ce compte n'a pas de profil dans l'application."}
      </p>
      <p className="mt-3 text-base text-ink-soft">
        Connecté en tant que {email}. Contacte un administrateur du groupe pour régler la situation.
      </p>
      <div className="mt-8 space-y-3">
        {/* L'accès a peut-être été rétabli : on relit l'état du compte sans avoir à se reconnecter. */}
        <Button onClick={reloadProfile}>Vérifier à nouveau</Button>
        <SignOutButton />
      </div>
    </SheetLayout>
  )
}

interface ProfileErrorScreenProps {
  error: AppError
  onRetry: () => void
}

/** Connecté, mais le profil n'a pas pu être lu (souvent : pas de réseau). */
export function ProfileErrorScreen({ error, onRetry }: ProfileErrorScreenProps) {
  return (
    <SheetLayout title="Chargement impossible">
      <p className="text-lg">{error.message}</p>
      <div className="mt-8 space-y-3">
        <Button onClick={onRetry}>Réessayer</Button>
        <SignOutButton />
      </div>
    </SheetLayout>
  )
}
