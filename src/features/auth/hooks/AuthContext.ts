import { createContext, useContext } from 'react'
import type { AuthState } from '@/features/auth/logic/authState'

export interface AuthContextValue {
  state: AuthState
  /** Relit le profil dans la base (après un échec, par exemple). */
  reloadProfile: () => void
  /** Signale qu'une déconnexion volontaire commence (vrai) ou a échoué (faux). */
  markSigningOut: (signingOut: boolean) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** État d'authentification courant. À utiliser dans n'importe quel composant. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>.')
  }
  return value
}

/**
 * Raccourci pour les écrans protégés par <RequireAuth> : l'utilisateur y est
 * forcément connecté et actif.
 */
export function useCurrentUser() {
  const { state } = useAuth()
  if (state.status !== 'ready') {
    throw new Error('useCurrentUser ne peut être utilisé que dans un écran protégé par <RequireAuth>.')
  }
  return state
}
