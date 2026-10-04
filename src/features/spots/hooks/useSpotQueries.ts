import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSpot,
  fetchNearbySpots,
  fetchSpotSubtypes,
  fetchRatingCategories,
  fetchSpotsLight,
  fetchSpotTypes,
  type CreateSpotInput,
} from '@/features/spots/api/spotsApi'
import type { AppError } from '@/lib/errors'
import type { NearbySpot, RatingCategory, SpotLight, SpotSubtype, SpotType } from '@/types/models'

export const spotQueryKeys = {
  types: ['spot-types'] as const,
  subtypes: ['spot-subtypes'] as const,
  ratingCategories: ['rating-categories'] as const,
  /** Préfixe commun à tout ce qui dépend des spots : sert à tout rafraîchir d'un coup. */
  all: ['spots'] as const,
  light: ['spots', 'light'] as const,
  nearby: ['spots', 'nearby'] as const,
}

/** Types de spots. Ils changent très rarement : gardés frais pendant une heure. */
export function useSpotTypes() {
  return useQuery<SpotType[], AppError>({
    queryKey: spotQueryKeys.types,
    queryFn: fetchSpotTypes,
    staleTime: 60 * 60_000,
  })
}

/** Sous-catégories de tous les types. Elles changent très rarement. */
export function useSpotSubtypes() {
  return useQuery<SpotSubtype[], AppError>({
    queryKey: spotQueryKeys.subtypes,
    queryFn: fetchSpotSubtypes,
    staleTime: 60 * 60_000,
  })
}

/** Liste légère de tous les spots, partagée par la carte et la liste. */
export function useSpotsLight() {
  return useQuery<SpotLight[], AppError>({
    queryKey: spotQueryKeys.light,
    queryFn: fetchSpotsLight,
  })
}

/** Catégories de notation de tous les types. Elles changent très rarement. */
export function useRatingCategories() {
  return useQuery<RatingCategory[], AppError>({
    queryKey: spotQueryKeys.ratingCategories,
    queryFn: fetchRatingCategories,
    staleTime: 60 * 60_000,
  })
}

/**
 * Spots existants autour d'un point (détection de doublons).
 * Ne demande rien tant que `position` est null.
 */
export function useNearbySpots(position: { lat: number; lng: number } | null, excludeSpotId?: string) {
  // Arrondi à 5 décimales (environ 1 m) : inutile de reposer la question pour un écart infime.
  const lat = position ? Number(position.lat.toFixed(5)) : null
  const lng = position ? Number(position.lng.toFixed(5)) : null

  return useQuery<NearbySpot[], AppError>({
    queryKey: [...spotQueryKeys.nearby, lat, lng, excludeSpotId ?? null],
    queryFn: () => fetchNearbySpots(lat!, lng!, excludeSpotId),
    enabled: lat !== null && lng !== null,
    staleTime: 30_000,
  })
}

/**
 * Création d'un spot. En cas de succès, la liste des spots est mise à jour
 * tout de suite (le nouveau spot apparaît sans attendre), puis rechargée.
 */
export function useCreateSpot() {
  const queryClient = useQueryClient()

  return useMutation<string, AppError, CreateSpotInput & { createdBy: string }>({
    mutationFn: (input) => createSpot(input),
    onSuccess: (spotId, input) => {
      const now = new Date().toISOString()
      queryClient.setQueryData<SpotLight[]>(spotQueryKeys.light, (current) =>
        current
          ? [
              ...current,
              {
                id: spotId,
                spot_type_id: input.spotTypeId,
                name: input.name.trim(),
                lat: input.lat,
                lng: input.lng,
                address: input.address,
                created_by: input.createdBy,
                created_at: now,
                updated_at: now,
                cover_thumb_path: null,
                subtype_id: input.subtypeId,
              },
            ]
          : current,
      )
      void queryClient.invalidateQueries({ queryKey: spotQueryKeys.all })
    },
  })
}
