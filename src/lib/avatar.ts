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

/** Couleurs de fond proposées à l'utilisateur pour son icône ou son initiale. */
export const AVATAR_COLOR_CHOICES = [
  '#067302',
  '#2F9E44',
  '#0C8599',
  '#1C7ED6',
  '#5C7CFA',
  '#7048E8',
  '#AE3EC9',
  '#D6336C',
  '#E03131',
  '#E8590C',
  '#FFE000',
  '#16233B',
] as const

/**
 * Couleur de fond d'un avatar : celle que la personne a choisie, sinon
 * celle tirée de son nom.
 */
export function avatarBackground(person: { display_name?: string | null; avatar_color?: string | null } | null | undefined): string {
  const chosen = person?.avatar_color
  return chosen && /^#[0-9a-fA-F]{6}$/.test(chosen) ? chosen : avatarColor(person?.display_name)
}

/** Couleur du dessin posé sur un fond : sombre sur un fond clair (jaune...), blanche sinon. */
export function readableOn(background: string): string {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(background)
  if (!match) return '#ffffff'
  const [red, green, blue] = [match[1], match[2], match[3]].map((part) => Number.parseInt(part, 16))
  // Luminosité perçue, de 0 (noir) à 255 (blanc).
  const brightness = 0.299 * red + 0.587 * green + 0.114 * blue
  return brightness > 160 ? '#16233b' : '#ffffff'
}

// --- Rangs ---------------------------------------------------------------------
//
// L'ornement qui entoure un avatar récompense le nombre de spots publiés.

export type AvatarRankId = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface AvatarRank {
  id: AvatarRankId
  /** Nombre de spots publiés à partir duquel le rang est atteint. */
  threshold: number
  title: string
  metal: string
}

/** Du premier au dernier rang. Pour changer un seuil, c'est ici. */
export const AVATAR_RANKS: readonly AvatarRank[] = [
  { id: 'bronze', threshold: 5, title: 'Explorateur', metal: 'Bronze' },
  { id: 'silver', threshold: 15, title: 'Pionnier', metal: 'Argent' },
  { id: 'gold', threshold: 30, title: 'Expert', metal: 'Or' },
  { id: 'platinum', threshold: 50, title: 'Gardien des lieux', metal: 'Platine' },
]

/** Rang atteint avec ce nombre de spots publiés, ou null en dessous du premier seuil. */
export function avatarRank(spotCount: number | null | undefined): AvatarRank | null {
  const count = typeof spotCount === 'number' && Number.isFinite(spotCount) ? spotCount : 0
  let reached: AvatarRank | null = null
  for (const rank of AVATAR_RANKS) {
    if (count >= rank.threshold) reached = rank
  }
  return reached
}

/** Prochain rang à atteindre, ou null si le dernier est acquis. */
export function nextAvatarRank(spotCount: number | null | undefined): AvatarRank | null {
  const count = typeof spotCount === 'number' && Number.isFinite(spotCount) ? spotCount : 0
  return AVATAR_RANKS.find((rank) => count < rank.threshold) ?? null
}
