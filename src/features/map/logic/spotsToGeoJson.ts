/**
 * Transforme la liste légère des spots en données GeoJSON pour la carte.
 * Fonction pure, sans dépendance à MapLibre.
 */
import { isValidCoordinate } from '@/features/map/logic/mapView'
import type { SpotLight } from '@/types/models'

/** Identifiant utilisé quand le type d'un spot est introuvable. */
export const UNKNOWN_TYPE_ID = 'unknown'

export interface SpotFeatureProperties {
  spotId: string
  /** Nom de l'image du marqueur (voir engine/pinImages). */
  pin: string
  /** Nom de l'image du marqueur quand le spot est sélectionné. */
  pinSelected: string
}

export interface SpotFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: SpotFeatureProperties
}

export interface SpotFeatureCollection {
  type: 'FeatureCollection'
  features: SpotFeature[]
}

/**
 * Clé du style de marqueur d'un spot : son type, ou son type et sa
 * sous-catégorie (qui apporte sa propre icône, sur la couleur du type).
 */
export function pinStyleKey(typeId: string, subtypeId?: string | null): string {
  return subtypeId ? `${typeId}~${subtypeId}` : typeId
}

export function pinImageId(typeId: string, selected: boolean): string {
  return `${selected ? 'pin-selected' : 'pin'}/${typeId}`
}

export function clusterImageId(label: string): string {
  return `cluster/${label}`
}

export type ParsedImageId =
  | { kind: 'pin'; typeId: string; selected: boolean }
  | { kind: 'cluster'; label: string }

/** Décode un nom d'image produit par les fonctions ci-dessus. Null si ce n'est pas l'une des nôtres. */
export function parseImageId(id: string): ParsedImageId | null {
  const separator = id.indexOf('/')
  if (separator <= 0) return null
  const prefix = id.slice(0, separator)
  const rest = id.slice(separator + 1)
  if (!rest) return null

  if (prefix === 'pin') return { kind: 'pin', typeId: rest, selected: false }
  if (prefix === 'pin-selected') return { kind: 'pin', typeId: rest, selected: true }
  if (prefix === 'cluster') return { kind: 'cluster', label: rest }
  return null
}

/**
 * @param knownTypeIds  clés des styles de marqueur connus (voir pinStyleKey) : un spot
 *                      dont ni le type ni la sous-catégorie n'y figurent reçoit le
 *                      marqueur neutre.
 */
export function spotsToGeoJson(spots: SpotLight[], knownTypeIds: ReadonlySet<string>): SpotFeatureCollection {
  const features: SpotFeature[] = []

  for (const spot of spots) {
    // Une coordonnée invalide ferait planter le regroupement de la carte.
    if (!isValidCoordinate(spot.lat, spot.lng)) continue
    // Du plus précis au plus général : (type, sous-catégorie), puis type seul, puis marqueur neutre.
    const withSubtype = pinStyleKey(spot.spot_type_id, spot.subtype_id)
    const typeId = knownTypeIds.has(withSubtype)
      ? withSubtype
      : knownTypeIds.has(spot.spot_type_id)
        ? spot.spot_type_id
        : UNKNOWN_TYPE_ID

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [spot.lng, spot.lat] },
      properties: {
        spotId: spot.id,
        pin: pinImageId(typeId, false),
        pinSelected: pinImageId(typeId, true),
      },
    })
  }

  return { type: 'FeatureCollection', features }
}
