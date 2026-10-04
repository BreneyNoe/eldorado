import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRatingSummary, fetchUserRatings, saveMyRatings } from '@/features/ratings/api/ratingsApi'
import { buildRatingRows } from '@/features/ratings/logic/ratingRows'
import { useRatingCategories } from '@/features/spots/hooks/useSpotQueries'
import type { AppError } from '@/lib/errors'
import type { RatingsInput, RatingSummary } from '@/types/models'

const ratingKeys = {
  /** Sous le préfixe "spots" : rafraîchi avec le reste quand un spot change. */
  summary: (spotId: string) => ['spots', 'ratings', spotId, 'summary'] as const,
  mine: (spotId: string, userId: string) => ['spots', 'ratings', spotId, 'mine', userId] as const,
  ofSpot: (spotId: string) => ['spots', 'ratings', spotId] as const,
}

/** Lignes de notes d'un spot : moyenne, nombre d'avis et note de l'utilisateur, par catégorie. */
export function useSpotRatings(spotId: string, spotTypeId: string, userId: string) {
  const categoriesQuery = useRatingCategories()
  const summaryQuery = useQuery<RatingSummary[], AppError>({
    queryKey: ratingKeys.summary(spotId),
    queryFn: () => fetchRatingSummary(spotId),
  })
  const mineQuery = useQuery<{ category_id: string; value: number }[], AppError>({
    queryKey: ratingKeys.mine(spotId, userId),
    queryFn: () => fetchUserRatings(spotId, userId),
  })

  const rows = useMemo(
    () => buildRatingRows(spotTypeId, categoriesQuery.data ?? [], summaryQuery.data ?? [], mineQuery.data ?? []),
    [spotTypeId, categoriesQuery.data, summaryQuery.data, mineQuery.data],
  )

  return {
    rows,
    isPending: categoriesQuery.isPending || summaryQuery.isPending || mineQuery.isPending,
    error: categoriesQuery.error ?? summaryQuery.error ?? mineQuery.error,
    refetch: () => {
      void categoriesQuery.refetch()
      void summaryQuery.refetch()
      void mineQuery.refetch()
    },
  }
}

export function useSaveMyRatings(spotId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, RatingsInput>({
    mutationFn: (ratings) => saveMyRatings(spotId, ratings),
    // Les moyennes ont changé : on relit tout ce qui concerne les notes de ce spot.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ratingKeys.ofSpot(spotId) }),
  })
}
