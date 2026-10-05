/**
 * Accès Supabase pour l'authentification et le profil.
 * Toutes les fonctions lèvent une AppError en cas d'échec.
 */
import { AVATAR_SETTINGS } from '@/config/constants'
import { createUuid } from '@/lib/uuid'
import { AppError, toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { AuthSession } from '@/features/auth/logic/authState'
import type { Profile } from '@/types/models'

interface SupabaseSessionLike {
  user: { id: string; email?: string | null }
}

function toAuthSession(session: SupabaseSessionLike | null): AuthSession | null {
  if (!session) return null
  return { userId: session.user.id, email: session.user.email ?? '' }
}

// --- Identité mémorisée pour l'usage hors ligne --------------------------------
//
// Une session Supabase se renouvelle toutes les heures, ce qui demande le
// réseau. Sans réseau, Supabase ne rend donc plus de session au bout d'une
// heure, et l'application croirait que personne n'est connecté. On retient
// ici qui était connecté sur cet appareil, pour pouvoir ouvrir l'application
// en consultation seule. Ce n'est pas un droit d'accès : aucune donnée ne
// peut être lue ni écrite sur le serveur sans une vraie session.

const REMEMBERED_IDENTITY_KEY = 'spots.auth.identity'

function rememberIdentity(session: AuthSession): void {
  try {
    window.localStorage.setItem(REMEMBERED_IDENTITY_KEY, JSON.stringify(session))
  } catch {
    // Stockage indisponible : pas d'ouverture hors ligne après expiration, rien de plus.
  }
}

function forgetIdentity(): void {
  try {
    window.localStorage.removeItem(REMEMBERED_IDENTITY_KEY)
  } catch {
    // Volontairement ignoré.
  }
}

function readRememberedIdentity(): AuthSession | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(REMEMBERED_IDENTITY_KEY) ?? 'null')
    if (parsed && typeof parsed === 'object') {
      const { userId, email } = parsed as Record<string, unknown>
      if (typeof userId === 'string' && typeof email === 'string') return { userId, email }
    }
  } catch {
    // Valeur illisible : on fait comme s'il n'y en avait pas.
  }
  return null
}

/**
 * Identité à utiliser tout de suite quand l'application s'ouvre sans réseau,
 * sans attendre Supabase : hors ligne, celui-ci peut mettre une trentaine de
 * secondes à renoncer au renouvellement de la session.
 */
export function readOfflineIdentity(): AuthSession | null {
  return typeof navigator !== 'undefined' && !navigator.onLine ? readRememberedIdentity() : null
}

/**
 * Session enregistrée sur cet appareil.
 *
 * Si Supabase n'en rend pas parce que le réseau est injoignable (la session
 * devait être renouvelée), on rend l'identité mémorisée : l'application
 * s'ouvre en consultation seule, et la vraie session revient avec le réseau.
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession()
  const session = toAuthSession(data.session)
  if (session) {
    rememberIdentity(session)
    return session
  }

  const unreachable = error ? toAppError(error).kind === 'network' : !navigator.onLine
  if (unreachable) return readRememberedIdentity()

  if (error) throw toAppError(error)
  return null
}

/**
 * Prévient à chaque connexion, déconnexion ou expiration de session.
 * Renvoie la fonction à appeler pour arrêter l'écoute.
 *
 * Important : Supabase interdit d'appeler d'autres fonctions Supabase à
 * l'intérieur de ce rappel (risque de blocage). On s'y contente donc de
 * transmettre la session ; le profil est lu ailleurs.
 */
export function subscribeToSession(onChange: (session: AuthSession | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    const next = toAuthSession(session)
    if (next) {
      rememberIdentity(next)
      onChange(next)
      return
    }
    // Au démarrage, c'est getCurrentSession qui décide : lui seul sait si
    // l'absence de session vient du réseau (voir plus haut).
    if (event === 'INITIAL_SESSION') return
    // Déconnexion réelle : volontaire, ou session refusée par le serveur.
    if (event === 'SIGNED_OUT') forgetIdentity()
    onChange(null)
  })
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw toAppError(error)
}

/**
 * Crée un compte. Renvoie vrai si la personne est connectée dans la foulée,
 * faux si Supabase attend d'abord une confirmation par e-mail (réglage
 * "Confirm email" resté activé).
 *
 * Le compte créé est actif aussitôt (migration 14). Un administrateur peut
 * le bannir ensuite depuis l'application.
 */
export async function signUp(email: string, password: string, displayName: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw toAppError(error)
  return data.session !== null
}

/**
 * Déconnecte cet appareil uniquement ("local"). Par défaut, Supabase
 * déconnecterait aussi tous les autres appareils du même compte.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw toAppError(error)
  forgetIdentity()
}

/** Profil du compte, ou null si la base n'en connaît pas. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw toAppError(error)
  return data
}

export async function updateDisplayName(userId: string, displayName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw toAppError(error)
  return data
}

/** Retire un fichier du bucket des photos de profil, sans jamais lever : un fichier resté seul ne gêne rien. */
async function removeAvatarFile(path: string | null | undefined): Promise<void> {
  if (!path) return
  try {
    await supabase.storage.from(AVATAR_SETTINGS.bucket).remove([path])
  } catch {
    // Volontairement ignoré.
  }
}

/**
 * Enregistre une photo de profil déjà recadrée et compressée.
 * L'ancienne photo, s'il y en avait une, est supprimée du stockage.
 */
export async function saveAvatarPhoto(userId: string, photo: Blob, previousPath: string | null): Promise<Profile> {
  // Le chemin commence par l'id de l'utilisateur : la base refuse tout autre dossier.
  const path = `${userId}/${createUuid()}.jpg`
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_SETTINGS.bucket)
    .upload(path, photo, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (uploadError) throw toAppError(uploadError)

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_path: path, avatar_icon: null })
    .eq('id', userId)
    .select('*')
    .single()
  if (error) {
    await removeAvatarFile(path)
    throw toAppError(error)
  }
  await removeAvatarFile(previousPath)
  return data
}

/** Choisit la couleur de fond de l'icône ou de l'initiale (null : couleur tirée du nom). */
export async function saveAvatarColor(userId: string, color: string | null): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update({ avatar_color: color }).eq('id', userId).select('*').single()
  if (error) throw toAppError(error)
  return data
}

/** Choisit une icône de profil (ou aucune, avec null). La photo éventuelle est supprimée. */
export async function saveAvatarIcon(userId: string, icon: string | null, previousPath: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_icon: icon, avatar_path: null })
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw toAppError(error)
  await removeAvatarFile(previousPath)
  return data
}

/**
 * Change le mot de passe après avoir vérifié l'actuel.
 *
 * La vérification passe par une vraie connexion : c'est ce qui empêche
 * quelqu'un qui tiendrait un téléphone déverrouillé de changer le mot de
 * passe, et cela satisfait Supabase s'il exige une connexion récente.
 */
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const check = await supabase.auth.signInWithPassword({ email, password: currentPassword })
  if (check.error) {
    const error = toAppError(check.error)
    if (check.error.code === 'invalid_credentials') {
      throw new AppError('validation', 'Le mot de passe actuel est incorrect.', {
        code: 'APP_WRONG_CURRENT_PASSWORD',
        cause: check.error,
      })
    }
    throw error
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    // Pris en compte seulement si le projet Supabase exige le mot de passe actuel.
    current_password: currentPassword,
  })
  if (error) throw toAppError(error)
}
