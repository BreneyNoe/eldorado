/**
 * État d'authentification de l'application, déduit de deux informations :
 * la session (y a-t-il quelqu'un de connecté sur cet appareil ?) et le
 * profil (que dit la base sur ce compte ?).
 *
 * Fonction pure : aucune dépendance à React ni à Supabase.
 */
import type { AppError } from '@/lib/errors'
import type { Profile } from '@/types/models'

/** Ce que l'application retient d'une session Supabase. */
export interface AuthSession {
  userId: string
  email: string
}

export type AuthState =
  /** On ne sait pas encore (démarrage, ou profil en cours de lecture). */
  | { status: 'loading' }
  /**
   * Personne de connecté. byUser est vrai juste après une déconnexion
   * volontaire : la prochaine connexion arrivera sur l'accueil, et non sur
   * la page que la personne précédente consultait.
   */
  | { status: 'signed_out'; byUser: boolean }
  /** Connecté, mais le profil n'a pas pu être lu (réseau...). On peut réessayer. */
  | { status: 'profile_error'; session: AuthSession; error: AppError }
  /** Connecté, mais le compte n'a plus de profil ou a été désactivé par un admin. */
  | { status: 'blocked'; session: AuthSession; reason: 'disabled' | 'no_profile' }
  | { status: 'ready'; session: AuthSession; profile: Profile; isAdmin: boolean }

export interface AuthStateInput {
  /** Faux tant que la lecture de la session enregistrée n'est pas terminée. */
  sessionKnown: boolean
  session: AuthSession | null
  /** undefined : pas encore lu. null : lu, mais aucun profil pour ce compte. */
  profile: Profile | null | undefined
  profileError: AppError | null
  /** L'utilisateur vient d'appuyer sur "Se déconnecter". */
  signedOutByUser?: boolean
}

export function deriveAuthState(input: AuthStateInput): AuthState {
  const { sessionKnown, session, profile, profileError } = input

  if (!sessionKnown) return { status: 'loading' }
  if (!session) return { status: 'signed_out', byUser: input.signedOutByUser ?? false }

  // Un profil déjà connu reste utilisable même si son rafraîchissement échoue.
  if (profile === undefined) {
    return profileError
      ? { status: 'profile_error', session, error: profileError }
      : { status: 'loading' }
  }

  if (profile === null) return { status: 'blocked', session, reason: 'no_profile' }
  if (!profile.is_active) return { status: 'blocked', session, reason: 'disabled' }

  return { status: 'ready', session, profile, isAdmin: profile.role === 'admin' }
}
