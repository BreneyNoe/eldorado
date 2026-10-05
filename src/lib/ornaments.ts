import bronze from '@/assets/ornaments/bronze.webp'
import dark from '@/assets/ornaments/dark.webp'
import gold from '@/assets/ornaments/gold.webp'
import platinum from '@/assets/ornaments/platinum.webp'
import silver from '@/assets/ornaments/silver.webp'
import type { AvatarRankId } from '@/lib/avatar'

/**
 * Les ornements sont des images, détourées et percées en leur centre pour
 * laisser voir l'avatar.
 *
 * `scale` : taille de l'image par rapport au diamètre de l'avatar. Plus le
 * rang est élevé, plus l'ornement déborde autour.
 *
 * Pour changer un ornement : remplacer son image dans src/assets/ornaments/
 * (carrée, fond transparent, trou centré) et ajuster ici son `scale`.
 */
export const ORNAMENTS: Record<AvatarRankId, { src: string; scale: number }> = {
  bronze: { src: bronze, scale: 1.5373 },
  silver: { src: silver, scale: 1.5711 },
  gold: { src: gold, scale: 1.7635 },
  platinum: { src: platinum, scale: 1.8796 },
  dark: { src: dark, scale: 2.2239 },
}

/**
 * L'image est posée un rien plus petite que sa taille théorique : son trou
 * central est alors légèrement plus étroit que l'avatar, ce qui évite tout
 * liseré entre les deux.
 */
const OVERLAP = 0.975

/** Largeur totale, ornement compris, d'un avatar de ce diamètre. Fonction pure. */
export function ornamentSize(rank: AvatarRankId, faceSize: number): number {
  return faceSize * ORNAMENTS[rank].scale * OVERLAP
}
