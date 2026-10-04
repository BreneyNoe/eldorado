/**
 * Calculs du panneau glissant (BottomSheet) : à quelle hauteur il s'arrête
 * quand on le lâche. Fonctions pures.
 */

/** Positions d'arrêt, de la plus basse à la plus haute. */
export type SheetSnap = 'peek' | 'half' | 'full'

export const SHEET_SNAPS: SheetSnap[] = ['peek', 'half', 'full']

/** Hauteur visible du panneau quand il est replié, en pixels (hors marge de sécurité de l'iPhone). */
export const SHEET_PEEK_HEIGHT = 70

/** Vitesse (pixels par milliseconde) au-delà de laquelle un geste compte comme un "coup de doigt". */
const FLICK_VELOCITY = 0.5

/** Hauteur visible de chaque position pour un espace disponible donné. */
export function snapHeights(available: number, peek: number): Record<SheetSnap, number> {
  const full = Math.max(available, peek)
  const half = Math.min(Math.max(Math.round(available * 0.5), peek), full)
  return { peek, half, full }
}

/**
 * Position d'arrêt après un glissement.
 * @param visible   hauteur visible au moment où le doigt se lève
 * @param velocity  vitesse verticale en px/ms, positive vers le haut
 */
export function resolveSnap(
  visible: number,
  velocity: number,
  heights: Record<SheetSnap, number>,
): SheetSnap {
  // Coup de doigt franc : on va à la position suivante dans le sens du geste.
  if (Math.abs(velocity) >= FLICK_VELOCITY) {
    if (velocity > 0) return SHEET_SNAPS.find((snap) => heights[snap] > visible + 1) ?? 'full'
    return [...SHEET_SNAPS].reverse().find((snap) => heights[snap] < visible - 1) ?? 'peek'
  }

  // Geste lent : on s'arrête à la position la plus proche.
  let closest: SheetSnap = 'peek'
  for (const snap of SHEET_SNAPS) {
    if (Math.abs(heights[snap] - visible) < Math.abs(heights[closest] - visible)) closest = snap
  }
  return closest
}

/** Position atteinte en touchant la poignée (sans glisser) : replié <-> mi-hauteur. */
export function toggleSnap(current: SheetSnap): SheetSnap {
  return current === 'peek' ? 'half' : 'peek'
}
