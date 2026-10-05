import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import {
  createRatingCategory,
  createSpotType,
  createSubtype,
  fetchAllPhotos,
  fetchAllUpdates,
  fetchOrphanFiles,
  fetchSetting,
  fetchStorageReport,
  fetchUserAvatars,
  listUsers,
  removeFiles,
  removeUserAvatar,
  saveSetting,
  updateRatingCategory,
  updateSpotType,
  updateSubtype,
  updateUser,
  type AdminPhoto,
  type AdminUpdate,
} from '@/features/admin/api/adminApi'
import { profileQueryKey } from '@/features/auth/hooks/queryKeys'
import { spotQueryKeys } from '@/features/spots/hooks/useSpotQueries'
import type { AppError } from '@/lib/errors'
import type { Json } from '@/types/database'
import type { AdminUser, OrphanFile, StorageReport } from '@/types/models'

export const ADMIN_PAGE_SIZE = 30

const adminKeys = {
  users: ['admin', 'users'] as const,
  avatars: ['admin', 'avatars'] as const,
  photos: ['admin', 'photos'] as const,
  updates: ['admin', 'updates'] as const,
  setting: (key: string) => ['admin', 'setting', key] as const,
  storage: ['admin', 'storage'] as const,
  orphans: ['admin', 'orphans'] as const,
}

/** Mutation d'administration : après un succès, rafraîchit les données listées dans `refresh`. */
function useAdminMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>, refresh: QueryKey[]) {
  const queryClient = useQueryClient()
  return useMutation<unknown, AppError, TInput>({
    mutationFn,
    onSuccess: () => Promise.all(refresh.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

// --- Utilisateurs ------------------------------------------------------------

export function useUsers() {
  return useQuery<AdminUser[], AppError>({ queryKey: adminKeys.users, queryFn: listUsers })
}

/** Avatars des comptes, par id d'utilisateur. */
export function useUserAvatars() {
  return useQuery<Awaited<ReturnType<typeof fetchUserAvatars>>, AppError>({
    queryKey: adminKeys.avatars,
    queryFn: fetchUserAvatars,
  })
}

export function useRemoveUserAvatar() {
  return useAdminMutation(
    ({ userId, avatarPath }: { userId: string; avatarPath: string | null }) => removeUserAvatar(userId, avatarPath),
    [adminKeys.avatars, ['spots'], profileQueryKey(null).slice(0, 1)],
  )
}

export function useUpdateUser() {
  // Le profil de l'utilisateur connecté fait partie de ce qui a pu changer (son propre rôle).
  return useAdminMutation(
    ({ userId, changes }: { userId: string; changes: Parameters<typeof updateUser>[1] }) => updateUser(userId, changes),
    [adminKeys.users, profileQueryKey(null).slice(0, 1)],
  )
}

// --- Modération ----------------------------------------------------------------

function usePaged<T>(queryKey: QueryKey, fetchPage: (from: number, to: number) => Promise<T[]>) {
  const query = useInfiniteQuery<T[], AppError>({
    queryKey,
    queryFn: ({ pageParam }) => {
      const from = pageParam as number
      return fetchPage(from, from + ADMIN_PAGE_SIZE - 1)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.length === ADMIN_PAGE_SIZE ? pages.length * ADMIN_PAGE_SIZE : undefined),
  })
  return {
    items: query.data?.pages.flat() ?? [],
    isPending: query.isPending,
    error: query.error,
    refetch: () => void query.refetch(),
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
  }
}

export function useAllPhotos() {
  return usePaged<AdminPhoto>(adminKeys.photos, fetchAllPhotos)
}

export function useAllUpdates() {
  return usePaged<AdminUpdate>(adminKeys.updates, fetchAllUpdates)
}

/** À appeler après une suppression faite depuis l'administration. */
export function useRefreshModeration() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.photos }),
      queryClient.invalidateQueries({ queryKey: adminKeys.updates }),
      queryClient.invalidateQueries({ queryKey: adminKeys.storage }),
      queryClient.invalidateQueries({ queryKey: spotQueryKeys.all }),
    ])
}

// --- Types, catégories, sous-catégories -------------------------------------------

export function useSaveSpotType() {
  return useAdminMutation(
    (input: { id?: string; values: Parameters<typeof createSpotType>[0] }) =>
      input.id ? updateSpotType(input.id, input.values) : createSpotType(input.values),
    [spotQueryKeys.types],
  )
}

export function useSaveRatingCategory() {
  return useAdminMutation(
    (input: { id?: string; values: Parameters<typeof createRatingCategory>[0] }) =>
      input.id ? updateRatingCategory(input.id, input.values) : createRatingCategory(input.values),
    [spotQueryKeys.ratingCategories],
  )
}

export function useSaveSubtype() {
  return useAdminMutation(
    (input: { id?: string; values: Parameters<typeof createSubtype>[0] }) =>
      input.id ? updateSubtype(input.id, input.values) : createSubtype(input.values),
    [spotQueryKeys.subtypes],
  )
}

// --- Réglages et stockage ------------------------------------------------------------

export function useSetting(key: string) {
  return useQuery<Json | null, AppError>({ queryKey: adminKeys.setting(key), queryFn: () => fetchSetting(key) })
}

export function useSaveSetting(key: string) {
  return useAdminMutation((value: Json) => saveSetting(key, value), [adminKeys.setting(key), spotQueryKeys.nearby, ['settings', key]])
}

export function useStorageReport() {
  return useQuery<StorageReport, AppError>({ queryKey: adminKeys.storage, queryFn: fetchStorageReport })
}

export function useOrphanFiles() {
  return useQuery<OrphanFile[], AppError>({ queryKey: adminKeys.orphans, queryFn: fetchOrphanFiles })
}

export function useRemoveOrphanFiles() {
  return useAdminMutation((names: string[]) => removeFiles(names), [adminKeys.orphans, adminKeys.storage])
}
