import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteSpot,
  deleteSpotPhoto,
  fetchSpot,
  fetchSpotPhotos,
  setCoverPhoto,
  updateSpot,
  type SpotChanges,
  type SpotDetail,
  type SpotPhotoWithAuthor,
} from '@/features/spots/api/spotDetailApi'
import { spotQueryKeys } from '@/features/spots/hooks/useSpotQueries'
import type { AppError } from '@/lib/errors'

export const spotDetailKeys = {
  detail: (spotId: string) => ['spots', 'detail', spotId] as const,
  photos: (spotId: string) => ['spots', 'photos', spotId] as const,
}

/** Le spot complet. `data` vaut null si le spot n'existe pas. */
export function useSpot(spotId: string) {
  return useQuery<SpotDetail | null, AppError>({
    queryKey: spotDetailKeys.detail(spotId),
    queryFn: () => fetchSpot(spotId),
  })
}

export function useSpotPhotos(spotId: string) {
  return useQuery<SpotPhotoWithAuthor[], AppError>({
    queryKey: spotDetailKeys.photos(spotId),
    queryFn: () => fetchSpotPhotos(spotId),
  })
}

/**
 * Après toute modification d'un spot, on rafraîchit tout ce qui en dépend :
 * sa fiche, ses photos, et la liste légère (nom, position, couverture).
 */
function useRefreshSpots() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: spotQueryKeys.all })
}

export function useUpdateSpot(spotId: string) {
  const refresh = useRefreshSpots()
  return useMutation<void, AppError, SpotChanges>({
    mutationFn: (changes) => updateSpot(spotId, changes),
    onSuccess: refresh,
  })
}

export function useSetCoverPhoto(spotId: string) {
  const refresh = useRefreshSpots()
  return useMutation<void, AppError, string>({
    mutationFn: (photoId) => setCoverPhoto(spotId, photoId),
    onSuccess: refresh,
  })
}

export function useDeleteSpotPhoto() {
  const refresh = useRefreshSpots()
  return useMutation<void, AppError, SpotPhotoWithAuthor>({
    mutationFn: (photo) => deleteSpotPhoto(photo),
    onSuccess: refresh,
  })
}

export function useDeleteSpot(spotId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, void>({
    mutationFn: () => deleteSpot(spotId),
    onSuccess: () => {
      // La fiche n'existe plus : on l'oublie au lieu de la recharger.
      queryClient.removeQueries({ queryKey: spotDetailKeys.detail(spotId) })
      queryClient.removeQueries({ queryKey: spotDetailKeys.photos(spotId) })
      return queryClient.invalidateQueries({ queryKey: spotQueryKeys.light })
    },
  })
}
