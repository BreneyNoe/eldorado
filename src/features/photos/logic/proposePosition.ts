/**
 * Choix de la position proposée pour un spot à partir de la localisation
 * contenue dans ses photos. Fonction pure.
 *
 * Règle :
 *   1. Les photos prises à moins de `groupingRadiusM` les unes des autres
 *      forment un groupe (un même lieu).
 *   2. On retient le groupe le plus nombreux ; à égalité, celui qui contient
 *      la première photo choisie.
 *   3. La position proposée est le point moyen de ce groupe.
 *
 * L'utilisateur reste libre de déplacer le repère ensuite.
 */
import { GEO_SETTINGS } from '@/config/constants'
import { distanceMeters, type LatLng } from '@/features/spots/logic/geo'

export interface PositionProposal {
  position: LatLng
  /** Nombre de photos qui ont servi à calculer la position. */
  usedCount: number
  /** Nombre de photos contenant une localisation. */
  locatedCount: number
  /** Nombre total de photos choisies. */
  totalCount: number
  /** Explication à afficher à l'utilisateur. */
  explanation: string
}

function centroid(points: LatLng[]): LatLng {
  const sum = points.reduce((total, point) => ({ lat: total.lat + point.lat, lng: total.lng + point.lng }), {
    lat: 0,
    lng: 0,
  })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

/**
 * @param locations  localisation de chaque photo, dans l'ordre du choix ; null si la photo n'en contient pas
 * @returns la proposition, ou null si aucune photo n'est localisée
 */
export function proposePosition(
  locations: (LatLng | null)[],
  groupingRadiusM: number = GEO_SETTINGS.photoGroupingRadiusM,
): PositionProposal | null {
  const located = locations.filter((location): location is LatLng => location !== null)
  if (located.length === 0) return null

  // Regroupement simple : chaque photo rejoint le premier groupe dont elle
  // est proche du point de départ, sinon elle en ouvre un nouveau.
  const groups: LatLng[][] = []
  for (const location of located) {
    const group = groups.find((candidate) => distanceMeters(candidate[0], location) <= groupingRadiusM)
    if (group) group.push(location)
    else groups.push([location])
  }

  // Le plus nombreux ; à égalité, le premier (il contient la photo choisie en premier).
  let best = groups[0]
  for (const group of groups) {
    if (group.length > best.length) best = group
  }

  const totalCount = locations.length
  const locatedCount = located.length
  const usedCount = best.length

  let explanation: string
  if (totalCount === 1) {
    explanation = 'Position lue dans la photo.'
  } else if (groups.length > 1) {
    explanation = `Les photos viennent de ${groups.length} lieux différents : position proposée d'après ${usedCount} photo${usedCount > 1 ? 's' : ''} sur ${totalCount}.`
  } else if (locatedCount < totalCount) {
    explanation = `Position lue dans ${locatedCount} photo${locatedCount > 1 ? 's' : ''} sur ${totalCount}.`
  } else {
    explanation = `Position moyenne des ${totalCount} photos.`
  }

  return { position: centroid(best), usedCount, locatedCount, totalCount, explanation }
}
