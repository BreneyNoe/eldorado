/**
 * Dimensions d'une image réduite pour tenir dans un carré de `maxEdge`
 * pixels, en gardant ses proportions. Une image déjà plus petite n'est
 * jamais agrandie. Fonction pure.
 */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= 0) return { width: 0, height: 0 }
  const scale = Math.min(1, maxEdge / longest)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
