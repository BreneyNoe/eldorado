import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchProfile,
  getCurrentSession,
  readOfflineIdentity,
  subscribeToSession,
} from '@/features/auth/api/authApi'
import { AuthContext, type AuthContextValue } from '@/features/auth/hooks/AuthContext'
import { profileQueryKey } from '@/features/auth/hooks/queryKeys'
import { deriveAuthState, type AuthSession } from '@/features/auth/logic/authState'
import { toAppError } from '@/lib/errors'

/**
 * Suit la session Supabase et le profil associé, et les met à disposition
 * de toute l'application via useAuth().
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Ouverture sans réseau : on part tout de suite de l'identité mémorisée sur
  // l'appareil (consultation seule). Sinon, on attend la réponse de Supabase.
  const [sessionKnown, setSessionKnown] = useState(() => readOfflineIdentity() !== null)
  const [session, setSession] = useState<AuthSession | null>(readOfflineIdentity)
  const [signedOutByUser, setSignedOutByUser] = useState(false)

  useEffect(() => {
    let active = true

    const apply = (next: AuthSession | null) => {
      if (!active) return
      // On ne change l'état que si l'utilisateur change réellement : Supabase
      // signale aussi les simples renouvellements de jeton, sans intérêt ici.
      setSession((current) =>
        current?.userId === next?.userId && current?.email === next?.email ? current : next,
      )
      setSessionKnown(true)
      // Une nouvelle connexion efface le souvenir de la déconnexion précédente.
      if (next) setSignedOutByUser(false)
    }

    const unsubscribe = subscribeToSession(apply)
    getCurrentSession()
      .then(apply)
      .catch(() => apply(null))

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const userId = session?.userId ?? null

  const {
    data: profile,
    error: profileError,
    fetchStatus: profileFetchStatus,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId!),
    enabled: userId !== null,
    // Relu au retour au premier plan : une désactivation ou un changement
    // de rôle par un admin est pris en compte sans se reconnecter.
    staleTime: 5 * 60_000,
    // Relu à chaque ouverture de l'application, même si une copie récente est
    // gardée sur l'appareil : un compte qui vient d'être activé (ou désactivé)
    // ne doit pas rester sur son ancien état.
    refetchOnMount: 'always',
  })

  // Hors ligne, une lecture est mise en attente au lieu d'échouer. S'il n'y a
  // aucun profil en mémoire, on le dit, plutôt que de laisser un chargement sans fin.
  const waitingForNetwork = profile === undefined && profileFetchStatus === 'paused'

  const value = useMemo<AuthContextValue>(() => {
    const state = deriveAuthState({
      sessionKnown,
      session,
      profile: userId === null ? undefined : profile,
      profileError: profileError
        ? toAppError(profileError)
        : waitingForNetwork
          ? toAppError({ message: 'Failed to fetch' })
          : null,
      signedOutByUser,
    })
    return {
      state,
      reloadProfile: () => void refetchProfile(),
      markSigningOut: setSignedOutByUser,
    }
  }, [sessionKnown, session, userId, profile, profileError, waitingForNetwork, refetchProfile, signedOutByUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
