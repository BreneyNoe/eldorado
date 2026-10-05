import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

/** Ce que tout membre peut voir du profil d'un autre. */
export interface PublicProfile {
  id: string
  display_name: string
  role: UserRole
  avatar_path: string | null
  avatar_icon: string | null
  avatar_color: string | null
  spot_count: number
  created_at: string
}

export interface UserStats {
  spotCount: number
  photoCount: number
  updateCount: number
}

/** Profil d'un utilisateur, ou null s'il n'existe pas (ou plus). */
export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, avatar_path, avatar_icon, avatar_color, spot_count, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}

/** Nombre de spots, de photos et d'updates de cet utilisateur. */
export async function fetchUserStats(userId: string): Promise<UserStats> {
  const { data, error } = await supabase.rpc('user_stats', { p_user_id: userId })
  if (error) throw toAppError(error)
  const row = data[0]
  return {
    spotCount: row?.spot_count ?? 0,
    photoCount: row?.photo_count ?? 0,
    updateCount: row?.update_count ?? 0,
  }
}
