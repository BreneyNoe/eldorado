import { useQuery } from '@tanstack/react-query'
import { IMAGE_SETTINGS } from '@/config/constants'
import { toAppError, type AppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

export const MAX_PHOTOS_SETTING_KEY = 'max_photos_per_spot'

async function fetchMaxPhotosPerSpot(): Promise<number> {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', MAX_PHOTOS_SETTING_KEY).maybeSingle()
  if (error) throw toAppError(error)
  const value = data?.value
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : IMAGE_SETTINGS.fallbackMaxPhotosPerSpot
}

/**
 * Nombre maximal de photos par spot. C'est un réglage de la base, modifiable
 * dans l'administration ; tant qu'il n'est pas lu, la valeur par défaut sert.
 *
 * L'interface s'en sert pour prévenir à temps. La limite elle-même est
 * appliquée par la base, qui refuse la photo de trop.
 */
export function useMaxPhotosPerSpot(): { maxPhotos: number; isLoading: boolean } {
  const query = useQuery<number, AppError>({
    queryKey: ['settings', MAX_PHOTOS_SETTING_KEY],
    queryFn: fetchMaxPhotosPerSpot,
    staleTime: 10 * 60_000,
  })
  return {
    maxPhotos: query.data ?? IMAGE_SETTINGS.fallbackMaxPhotosPerSpot,
    // Vrai le temps de la toute première lecture. Les écrans attendent alors un
    // instant avant de proposer l'ajout de photos : sinon, on pourrait en choisir
    // plus que la limite réelle. Hors ligne ou en cas d'erreur, la valeur par
    // défaut sert sans attendre.
    isLoading: query.isPending && query.fetchStatus === 'fetching',
  }
}
