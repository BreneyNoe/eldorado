/**
 * Icônes utilisables pour un type de spot.
 *
 * La base stocke un nom d'icône (colonne spot_types.icon). Ce fichier fait
 * le lien avec le dessin. Pour proposer une nouvelle icône, il suffit de
 * l'ajouter ici : elle devient utilisable sur la carte et dans l'interface.
 */
import {
  Bird,
  Building2,
  Camera,
  Castle,
  Factory,
  Fish,
  Flower2,
  Footprints,
  Landmark,
  MapPin,
  Mountain,
  Scooter,
  Tent,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react'

export const SPOT_ICONS: Record<string, LucideIcon> = {
  trees: Trees,
  fish: Fish,
  waves: Waves,
  factory: Factory,
  scooter: Scooter,
  mountain: Mountain,
  tent: Tent,
  camera: Camera,
  castle: Castle,
  landmark: Landmark,
  building: Building2,
  footprints: Footprints,
  flower: Flower2,
  bird: Bird,
  pin: MapPin,
}

/** Icône d'un type, ou une épingle neutre si le nom est inconnu. */
export function resolveSpotIcon(name: string | null | undefined): LucideIcon {
  return (name && SPOT_ICONS[name]) || MapPin
}

/** Couleur utilisée quand le type d'un spot est introuvable. */
export const UNKNOWN_TYPE_COLOR = '#566379'

/** Noms des icônes du jeu de base, pour les proposer dans l'administration. */
export const SPOT_ICON_NAMES = Object.keys(SPOT_ICONS).sort()
