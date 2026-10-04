import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { AccountBlockedScreen, ProfileErrorScreen } from '@/features/auth/components/AccountProblemScreens'
import { useAuth } from '@/features/auth/hooks/AuthContext'

/**
 * Garde des écrans réservés aux utilisateurs connectés et actifs.
 *
 * Ce n'est qu'un confort d'interface : la vraie protection est dans la
 * base (règles RLS), qui refuse les données quoi qu'affiche l'application.
 */
export function RequireAuth() {
  const { state, reloadProfile } = useAuth()
  const location = useLocation()

  switch (state.status) {
    case 'loading':
      return <FullScreenLoader />
    case 'signed_out':
      // On retient la page demandée pour y revenir après la connexion,
      // sauf si la personne vient de se déconnecter elle-même.
      return (
        <Navigate
          to="/login"
          replace
          state={state.byUser ? null : { from: `${location.pathname}${location.search}` }}
        />
      )
    case 'profile_error':
      return <ProfileErrorScreen error={state.error} onRetry={reloadProfile} />
    case 'blocked':
      return <AccountBlockedScreen email={state.session.email} reason={state.reason} />
    case 'ready':
      return <Outlet />
  }
}
