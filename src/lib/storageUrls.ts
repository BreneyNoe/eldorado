/**
 * Adresses publiques des photos dans Supabase Storage.
 * Aucun appel réseau : l'adresse se déduit du chemin enregistré en base.
 */
import { AVATAR_SETTINGS, STORAGE_BUCKET } from '@/config/constants'
import { getEnv } from '@/config/env'

/** Construit l'adresse à partir de celle du projet. Fonction pure, testable sans configuration. */
export function buildPublicPhotoUrl(supabaseUrl: string, path: string): string {
  const safePath = path.split('/').map(encodeURIComponent).join('/')
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${safePath}`
}

/** Adresse publique d'une photo, ou null s'il n'y a pas de chemin. */
export function publicPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return buildPublicPhotoUrl(getEnv().supabaseUrl, path)
}

/** Adresse publique d'une photo de profil, ou null s'il n'y en a pas. */
export function publicAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const safePath = path.split('/').map(encodeURIComponent).join('/')
  return `${getEnv().supabaseUrl}/storage/v1/object/public/${AVATAR_SETTINGS.bucket}/${safePath}`
}
