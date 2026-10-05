/**
 * Apparence d'un avatar sans photo : une couleur et une initiale tirées du
 * nom. Fonctions pures.
 */

/** Couleurs possibles du disque : assez foncées pour un texte blanc lisible. */
export const AVATAR_COLORS = ['#2F9E44', '#E8590C', '#1C7ED6', '#7048E8', '#D6336C', '#0C8599', '#5C7CFA', '#AE3EC9'] as const

/** Toujours la même couleur pour un même nom, quelle que soit la casse. */
export function avatarColor(name: string | null | undefined): string {
  const text = (name ?? '').trim().toLowerCase()
  let hash = 0
  for (const character of text) hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 1_000_003
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/** Première lettre du nom, en majuscule ; "?" pour un nom vide ou un compte supprimé. */
export function avatarInitial(name: string | null | undefined): string {
  const first = [...(name ?? '').trim()][0]
  return first ? first.toLocaleUpperCase('fr') : '?'
}
