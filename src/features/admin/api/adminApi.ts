/**
 * Accès aux données de l'administration.
 *
 * Aucune de ces fonctions ne contourne la sécurité : elles utilisent la même
 * clé publique que le reste de l'application. C'est la base qui vérifie, à
 * chaque appel, que l'utilisateur connecté est administrateur. Appelées par
 * un simple membre, elles échouent.
 *
 * Toutes les fonctions lèvent une AppError en cas d'échec.
 */
import { AVATAR_SETTINGS, STORAGE_BUCKET } from '@/config/constants'
import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { Database, Json, UserRole } from '@/types/database'
import type { AdminUser, OrphanFile, SpotPhoto, SpotUpdate, StorageReport } from '@/types/models'

type Tables = Database['public']['Tables']

/** La base n'a modifié aucune ligne : droits insuffisants, ou élément disparu. */
function refused(): never {
  throw toAppError({ code: '42501', message: 'admin write refused' })
}

// --- Utilisateurs ------------------------------------------------------------

export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw toAppError(error)
  return data
}

export async function updateUser(userId: string, changes: { role?: UserRole; is_active?: boolean }): Promise<void> {
  const { data, error } = await supabase.from('profiles').update(changes).eq('id', userId).select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) refused()
}

/** Avatars de tous les comptes : la liste des utilisateurs ne les donne pas. */
export async function fetchUserAvatars(): Promise<
  { id: string; avatar_path: string | null; avatar_icon: string | null; avatar_color: string | null; spot_count: number }[]
> {
  const { data, error } = await supabase.from('profiles').select('id, avatar_path, avatar_icon, avatar_color, spot_count')
  if (error) throw toAppError(error)
  return data
}

/** Retire l'avatar d'un compte (photo déplacée, par exemple). Son fichier est supprimé du stockage. */
export async function removeUserAvatar(userId: string, avatarPath: string | null): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_path: null, avatar_icon: null })
    .eq('id', userId)
    .select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) refused()
  if (avatarPath) {
    try {
      await supabase.storage.from(AVATAR_SETTINGS.bucket).remove([avatarPath])
    } catch {
      // Un fichier resté seul ne gêne rien.
    }
  }
}

// --- Modération ----------------------------------------------------------------

export interface AdminPhoto extends SpotPhoto {
  uploader: { display_name: string } | null
  spot: { name: string } | null
}

/** Photos de tous les spots, des plus récentes aux plus anciennes. */
export async function fetchAllPhotos(from: number, to: number): Promise<AdminPhoto[]> {
  const { data, error } = await supabase
    .from('spot_photos')
    // "!spot_photos_spot_id_fkey" : deux liens existent entre photos et spots
    // (le spot d'une photo, la couverture d'un spot) ; on précise lequel suivre.
    .select(
      'id, spot_id, uploaded_by, path_standard, path_thumb, width, height, size_bytes, taken_at, created_at, uploader:profiles(display_name), spot:spots!spot_photos_spot_id_fkey(name)',
    )
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to)
  if (error) throw toAppError(error)
  return data as unknown as AdminPhoto[]
}

export interface AdminUpdate extends SpotUpdate {
  author: { display_name: string } | null
  spot: { name: string } | null
}

/** Updates de tous les spots, des plus récents aux plus anciens. */
export async function fetchAllUpdates(from: number, to: number): Promise<AdminUpdate[]> {
  const { data, error } = await supabase
    .from('spot_updates')
    .select('id, spot_id, author_id, body, created_at, updated_at, author:profiles(display_name), spot:spots(name)')
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to)
  if (error) throw toAppError(error)
  return data as unknown as AdminUpdate[]
}

// --- Types, catégories de notes, sous-catégories ---------------------------------

export async function createSpotType(values: Tables['spot_types']['Insert']): Promise<void> {
  const { error } = await supabase.from('spot_types').insert(values)
  if (error) throw toAppError(error)
}

export async function updateSpotType(id: string, changes: Tables['spot_types']['Update']): Promise<void> {
  const { data, error } = await supabase.from('spot_types').update(changes).eq('id', id).select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) refused()
}

export async function createRatingCategory(values: Tables['rating_categories']['Insert']): Promise<void> {
  const { error } = await supabase.from('rating_categories').insert(values)
  if (error) throw toAppError(error)
}

export async function updateRatingCategory(id: string, changes: Tables['rating_categories']['Update']): Promise<void> {
  const { data, error } = await supabase.from('rating_categories').update(changes).eq('id', id).select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) refused()
}

export async function createSubtype(values: Tables['spot_subtypes']['Insert']): Promise<void> {
  const { error } = await supabase.from('spot_subtypes').insert(values)
  if (error) throw toAppError(error)
}

export async function updateSubtype(id: string, changes: Tables['spot_subtypes']['Update']): Promise<void> {
  const { data, error } = await supabase.from('spot_subtypes').update(changes).eq('id', id).select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) refused()
}

// --- Réglages ----------------------------------------------------------------------

/** Valeur d'un réglage global, ou null s'il n'existe pas. */
export async function fetchSetting(key: string): Promise<Json | null> {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle()
  if (error) throw toAppError(error)
  return data?.value ?? null
}

export async function saveSetting(key: string, value: Json): Promise<void> {
  const { data, error } = await supabase.from('app_settings').upsert({ key, value }).select('key')
  if (error) throw toAppError(error)
  if (data.length === 0) refused()
}

// --- Stockage ------------------------------------------------------------------------

export async function fetchStorageReport(): Promise<StorageReport> {
  const { data, error } = await supabase.rpc('admin_storage_report')
  if (error) throw toAppError(error)
  return data[0] ?? { file_count: 0, file_bytes: 0, photo_count: 0, photo_bytes: 0 }
}

/**
 * Fichiers du stockage qu'aucune photo ne référence (restes d'un envoi ou
 * d'une suppression interrompus). Les fichiers de moins d'une heure sont
 * ignorés : un envoi est peut-être en cours.
 */
export async function fetchOrphanFiles(): Promise<OrphanFile[]> {
  const { data, error } = await supabase.rpc('admin_orphan_files')
  if (error) throw toAppError(error)
  return data
}

/** Supprime des fichiers du stockage. Renvoie le nombre de fichiers réellement supprimés. */
export async function removeFiles(names: string[]): Promise<number> {
  if (names.length === 0) return 0
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).remove(names)
  if (error) throw toAppError(error)
  return data?.length ?? 0
}
