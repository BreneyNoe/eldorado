/**
 * Position de la caméra : valeur par défaut, mémorisation entre deux
 * ouvertures, et cadrage sur un ensemble de spots.
 * Fonctions pures, sans dépendance à MapLibre.
 */
import type { Bounds } from '@/features/spots/logic/geo'

export interface MapView {
  lng: number
  lat: number
  zoom: number
}

/** [[ouest, sud], [est, nord]] */
export type MapBounds = Bounds

/** Vue d'ensemble de la France métropolitaine, utilisée tant qu'on ne sait rien de mieux. */
export const DEFAULT_VIEW: MapView = { lng: 2.5, lat: 46.6, zoom: 4.6 }

/** Zoom appliqué quand on centre la carte sur la position de l'utilisateur ou sur un spot. */
export const FOCUS_ZOOM = 14

const MIN_ZOOM = 0
const MAX_ZOOM = 22

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    isFiniteNumber(lat) && isFiniteNumber(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  )
}

/** Relit une vue enregistrée. Renvoie null si elle est absente ou abîmée. */
export function parseSavedView(raw: string | null | undefined): MapView | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const { lng, lat, zoom } = value as Record<string, unknown>
    if (!isValidCoordinate(lat, lng) || !isFiniteNumber(zoom)) return null
    if (zoom < MIN_ZOOM || zoom > MAX_ZOOM) return null
    return { lng: lng as number, lat: lat as number, zoom }
  } catch {
    return null
  }
}

export function serializeView(view: MapView): string {
  // 5 décimales : précision d'environ 1 mètre, largement suffisante.
  return JSON.stringify({
    lng: Number(view.lng.toFixed(5)),
    lat: Number(view.lat.toFixed(5)),
    zoom: Number(view.zoom.toFixed(2)),
  })
}

/** Plus petit rectangle contenant tous les points. Null s'il n'y en a aucun de valide. */
export function boundsOfPoints(points: { lat: number; lng: number }[]): MapBounds | null {
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity

  for (const point of points) {
    if (!isValidCoordinate(point.lat, point.lng)) continue
    west = Math.min(west, point.lng)
    east = Math.max(east, point.lng)
    south = Math.min(south, point.lat)
    north = Math.max(north, point.lat)
  }

  if (west === Infinity) return null
  return [
    [west, south],
    [east, north],
  ]
}
