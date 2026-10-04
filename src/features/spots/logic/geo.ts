/**
 * Calculs géographiques simples et tri des spots.
 * Fonctions pures, sans dépendance à React ni à la carte.
 */
import type { SpotLight } from '@/types/models'

export interface LatLng {
  lat: number
  lng: number
}

/** [[ouest, sud], [est, nord]] */
export type Bounds = [[number, number], [number, number]]

const EARTH_RADIUS_M = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Distance à vol d'oiseau entre deux points, en mètres (formule de haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** "350 m", "1,2 km", "48 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  const km = meters / 1000
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}

/** Spots situés dans le rectangle affiché par la carte. */
export function spotsInBounds(spots: SpotLight[], bounds: Bounds): SpotLight[] {
  const [[west, south], [east, north]] = bounds
  // Rectangle à cheval sur l'antiméridien (ouest > est) : rare, mais géré.
  const crossesAntimeridian = west > east

  return spots.filter((spot) => {
    if (spot.lat < south || spot.lat > north) return false
    return crossesAntimeridian ? spot.lng >= west || spot.lng <= east : spot.lng >= west && spot.lng <= east
  })
}

export type SpotSortMode = 'recent' | 'name' | 'distance'

/**
 * Trie sans modifier le tableau d'origine.
 * @param origin  point de référence, obligatoire pour le mode "distance"
 */
export function sortSpots(spots: SpotLight[], mode: SpotSortMode, origin?: LatLng | null): SpotLight[] {
  const sorted = [...spots]

  if (mode === 'name') {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base', numeric: true }))
  }

  if (mode === 'distance' && origin) {
    const distances = new Map(sorted.map((spot) => [spot.id, distanceMeters(origin, spot)]))
    return sorted.sort((a, b) => distances.get(a.id)! - distances.get(b.id)!)
  }

  // "recent", et repli du mode "distance" sans point de référence.
  return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
}
