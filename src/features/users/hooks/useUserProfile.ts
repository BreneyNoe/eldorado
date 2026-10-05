import { useQuery } from '@tanstack/react-query'
import { fetchPublicProfile, fetchUserStats, type PublicProfile, type UserStats } from '@/features/users/api/usersApi'
import type { AppError } from '@/lib/errors'

export const userQueryKeys = {
  profile: (userId: string) => ['users', 'profile', userId] as const,
  stats: (userId: string) => ['users', 'stats', userId] as const,
}

export function usePublicProfile(userId: string) {
  return useQuery<PublicProfile | null, AppError>({
    queryKey: userQueryKeys.profile(userId),
    queryFn: () => fetchPublicProfile(userId),
    staleTime: 60_000,
    // Relu à chaque ouverture du profil : la copie gardée s'affiche tout de suite, puis se met à jour.
    refetchOnMount: 'always',
  })
}

export function useUserStats(userId: string) {
  return useQuery<UserStats, AppError>({
    queryKey: userQueryKeys.stats(userId),
    queryFn: () => fetchUserStats(userId),
    staleTime: 60_000,
    // Relu à chaque ouverture du profil : la copie gardée s'affiche tout de suite, puis se met à jour.
    refetchOnMount: 'always',
  })
}
