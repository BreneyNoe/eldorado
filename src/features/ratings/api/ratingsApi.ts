/**
 * Notes d'un spot : moyennes par catégorie, notes de l'utilisateur, enregistrement.
 * Toutes les fonctions lèvent une AppError en cas d'échec.
 */
import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { RatingsInput, RatingSummary } from '@/types/models'

/** Moyenne et nombre d'avis de chaque catégorie notée du spot (vue calculée par la base). */
export async function fetchRatingSummary(spotId: string): Promise<RatingSummary[]> {
  const { data, error } = await supabase.from('spot_rating_summary').select('*').eq('spot_id', spotId)
  if (error) throw toAppError(error)
  return data
}

/** Les notes qu'un utilisateur a données à ce spot. */
export async function fetchUserRatings(spotId: string, userId: string): Promise<{ category_id: string; value: number }[]> {
  const { data, error } = await supabase
    .from('spot_ratings')
    .select('category_id, value')
    .eq('spot_id', spotId)
    .eq('user_id', userId)
  if (error) throw toAppError(error)
  return data
}

/**
 * Enregistre les notes de l'utilisateur connecté sur un spot.
 * `ratings` : { id de catégorie : note de 1 à 5, ou null pour retirer sa note }.
 * Les catégories absentes ne sont pas touchées, les notes des autres non plus.
 */
export async function saveMyRatings(spotId: string, ratings: RatingsInput): Promise<void> {
  const { error } = await supabase.rpc('set_spot_ratings', { p_spot_id: spotId, p_ratings: ratings })
  if (error) throw toAppError(error)
}
