/** Clé du cache pour le profil d'un utilisateur. */
export function profileQueryKey(userId: string | null) {
  return ['profile', userId] as const
}
