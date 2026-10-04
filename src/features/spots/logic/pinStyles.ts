/**
 * Styles des marqueurs de la carte : couleur et icône de chaque type, et de
 * chaque sous-catégorie (qui garde la couleur de son type). Fonction pure.
 */
import { pinStyleKey } from '@/features/map/logic/spotsToGeoJson'
import type { SpotSubtype, SpotType } from '@/types/models'

export interface PinStyle {
  color: string
  icon: string
}

export function buildPinStyles(types: SpotType[], subtypes: SpotSubtype[]): Record<string, PinStyle> {
  const styles: Record<string, PinStyle> = {}
  const colorByType = new Map<string, string>()

  for (const type of types) {
    styles[pinStyleKey(type.id)] = { color: type.color, icon: type.icon }
    colorByType.set(type.id, type.color)
  }
  for (const subtype of subtypes) {
    const color = colorByType.get(subtype.spot_type_id)
    if (color) styles[pinStyleKey(subtype.spot_type_id, subtype.id)] = { color, icon: subtype.icon }
  }
  return styles
}
