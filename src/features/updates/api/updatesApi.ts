/**
 * Journal d'updates d'un spot.
 * Toutes les fonctions lèvent une AppError en cas d'échec.
 */
import type { AvatarPerson } from '@/components/Avatar'
import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { SpotUpdate } from '@/types/models'

/** Un update, avec le nom affiché de son auteur (null si le compte a été supprimé). */
export interface SpotUpdateWithAuthor extends SpotUpdate {
  author: AvatarPerson | null
}

const UPDATE_COLUMNS = 'id, spot_id, author_id, body, created_at, updated_at, author:profiles(display_name, avatar_path, avatar_icon, avatar_color, spot_count)'

/**
 * Une page du journal, du plus récent au plus ancien.
 * @param from, to  positions de la première et de la dernière ligne voulues, incluses
 */
export async function fetchSpotUpdates(spotId: string, from: number, to: number): Promise<SpotUpdateWithAuthor[]> {
  const { data, error } = await supabase
    .from('spot_updates')
    .select(UPDATE_COLUMNS)
    .eq('spot_id', spotId)
    .order('created_at', { ascending: false })
    .order('id')
    .range(from, to)
  if (error) throw toAppError(error)
  return data
}

/** Publie un update. L'auteur et la date sont posés par la base. */
export async function addSpotUpdate(spotId: string, body: string): Promise<void> {
  const { error } = await supabase.from('spot_updates').insert({ spot_id: spotId, body: body.trim() })
  if (error) throw toAppError(error)
}

/** Modifie le texte d'un update (son auteur uniquement : la base le vérifie). */
export async function editSpotUpdate(updateId: string, body: string): Promise<void> {
  const { data, error } = await supabase.from('spot_updates').update({ body: body.trim() }).eq('id', updateId).select('id')
  if (error) throw toAppError(error)
  // Aucune ligne modifiée : la base a refusé en silence, ou l'update n'existe plus.
  if (data.length === 0) throw toAppError({ code: '42501', message: 'update edit refused' })
}

/** Supprime un update (son auteur et les admins). */
export async function deleteSpotUpdate(updateId: string): Promise<void> {
  const { data, error } = await supabase.from('spot_updates').delete().eq('id', updateId).select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) throw toAppError({ code: '42501', message: 'update delete refused' })
}
