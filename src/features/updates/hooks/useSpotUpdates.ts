import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addSpotUpdate,
  deleteSpotUpdate,
  editSpotUpdate,
  fetchSpotUpdates,
  type SpotUpdateWithAuthor,
} from '@/features/updates/api/updatesApi'
import type { AppError } from '@/lib/errors'

/** Nombre d'updates chargés à la fois. */
export const UPDATES_PAGE_SIZE = 20

/** Sous le préfixe "spots" : oublié avec le reste quand un spot est supprimé. */
const updatesKey = (spotId: string) => ['spots', 'updates', spotId] as const

/**
 * Journal d'un spot, chargé par pages : les plus récents d'abord, les plus
 * anciens à la demande.
 */
export function useSpotUpdates(spotId: string) {
  const query = useInfiniteQuery<SpotUpdateWithAuthor[], AppError>({
    queryKey: updatesKey(spotId),
    queryFn: ({ pageParam }) => {
      const from = pageParam as number
      return fetchSpotUpdates(spotId, from, from + UPDATES_PAGE_SIZE - 1)
    },
    initialPageParam: 0,
    // Une page pleine laisse supposer qu'il en reste : la suivante commence après ce qu'on a déjà.
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === UPDATES_PAGE_SIZE ? pages.length * UPDATES_PAGE_SIZE : undefined,
  })

  return {
    updates: query.data?.pages.flat() ?? [],
    isPending: query.isPending,
    error: query.error,
    refetch: () => void query.refetch(),
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
  }
}

function useRefreshUpdates(spotId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: updatesKey(spotId) })
}

export function useAddSpotUpdate(spotId: string) {
  const refresh = useRefreshUpdates(spotId)
  return useMutation<void, AppError, string>({
    mutationFn: (body) => addSpotUpdate(spotId, body),
    onSuccess: refresh,
  })
}

export function useEditSpotUpdate(spotId: string) {
  const refresh = useRefreshUpdates(spotId)
  return useMutation<void, AppError, { updateId: string; body: string }>({
    mutationFn: ({ updateId, body }) => editSpotUpdate(updateId, body),
    onSuccess: refresh,
  })
}

export function useDeleteSpotUpdate(spotId: string) {
  const refresh = useRefreshUpdates(spotId)
  return useMutation<void, AppError, string>({
    mutationFn: (updateId) => deleteSpotUpdate(updateId),
    onSuccess: refresh,
  })
}
