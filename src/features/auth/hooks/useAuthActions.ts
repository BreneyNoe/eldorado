/**
 * Actions d'authentification, sous forme de mutations : chacune expose
 * isPending (chargement), error (AppError) et isSuccess.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  changePassword,
  saveAvatarColor,
  saveAvatarIcon,
  saveAvatarPhoto,
  saveRankSeen,
  signIn,
  signOut,
  signUp,
  updateDisplayName,
} from '@/features/auth/api/authApi'
import { useAuth } from '@/features/auth/hooks/AuthContext'
import { profileQueryKey } from '@/features/auth/hooks/queryKeys'
import { normalizeEmail } from '@/features/auth/logic/validation'
import type { AppError } from '@/lib/errors'
import type { Profile } from '@/types/models'

export function useSignIn() {
  return useMutation<void, AppError, { email: string; password: string }>({
    mutationFn: ({ email, password }) => signIn(normalizeEmail(email), password),
  })
}

/** Création d'un compte. Le résultat vaut vrai si la personne est connectée dans la foulée. */
export function useSignUp() {
  return useMutation<boolean, AppError, { email: string; password: string; displayName: string }>({
    mutationFn: ({ email, password, displayName }) => signUp(normalizeEmail(email), password, displayName.trim()),
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  const { markSigningOut } = useAuth()
  return useMutation<void, AppError, void>({
    mutationFn: () => {
      // Prévenu avant l'appel : le garde de route saura que le retour à
      // l'écran de connexion est voulu, et ne mémorisera pas la page en cours.
      markSigningOut(true)
      return signOut()
    },
    // On vide le cache : la personne suivante sur cet appareil ne doit rien
    // voir des données chargées par la précédente.
    onSuccess: () => queryClient.clear(),
    onError: () => markSigningOut(false),
  })
}

export function useUpdateDisplayName(userId: string) {
  const queryClient = useQueryClient()
  return useMutation<Profile, AppError, string>({
    mutationFn: (displayName) => updateDisplayName(userId, displayName),
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(userId), profile),
  })
}

/**
 * Enregistrement de l'avatar : une photo (déjà préparée), une icône, ou la couleur du fond.
 * Après coup, tout ce qui affiche l'avatar d'un auteur est rafraîchi.
 */
export function useSaveAvatar(userId: string, previousPath: string | null) {
  const queryClient = useQueryClient()
  return useMutation<Profile, AppError, { photo: Blob } | { icon: string | null } | { color: string | null }>({
    mutationFn: (choice) => {
      if ('photo' in choice) return saveAvatarPhoto(userId, choice.photo, previousPath)
      if ('color' in choice) return saveAvatarColor(userId, choice.color)
      return saveAvatarIcon(userId, choice.icon, previousPath)
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(userId), profile)
      // Fiches, journaux et listes où cet utilisateur apparaît comme auteur.
      void queryClient.invalidateQueries({ queryKey: ['spots'] })
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

/** Enregistre que l'annonce d'un rang a été vue. */
export function useAcknowledgeRank(userId: string) {
  const queryClient = useQueryClient()
  return useMutation<Profile, AppError, number>({
    mutationFn: (threshold) => saveRankSeen(userId, threshold),
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(userId), profile),
  })
}

export function useChangePassword(email: string) {
  return useMutation<void, AppError, { current: string; next: string }>({
    mutationFn: ({ current, next }) => changePassword(email, current, next),
  })
}
