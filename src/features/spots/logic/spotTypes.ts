/**
 * Types d'un spot : son type principal et ses types supplémentaires.
 * Fonctions pures.
 */
import type { SpotSubtype, SpotType } from '@/types/models'

/** Ids de tous les types d'un spot : le principal d'abord, sans doublon. */
export function allTypeIds(mainTypeId: string | null | undefined, extraTypeIds: readonly string[] | null | undefined): string[] {
  const ids = [mainTypeId, ...(extraTypeIds ?? [])].filter((id): id is string => Boolean(id))
  return [...new Set(ids)]
}

/** Types supplémentaires connus d'un spot, dans l'ordre où ils sont enregistrés. */
export function extraTypesOf(
  extraTypeIds: readonly string[] | null | undefined,
  typesById: ReadonlyMap<string, SpotType>,
): SpotType[] {
  return (extraTypeIds ?? []).map((id) => typesById.get(id)).filter((type): type is SpotType => type !== undefined)
}

/** "Pêche + Urbex" : le type principal, puis les supplémentaires. */
export function typesLabel(mainType: SpotType | undefined, extraTypes: readonly SpotType[] = []): string {
  return [mainType?.label ?? 'Type inconnu', ...extraTypes.map((type) => type.label)].join(' + ')
}

/**
 * Vrai si le spot doit porter une sous-catégorie : l'un de ses types en
 * propose d'actives sans les rendre facultatives (Ride, mais pas Nature,
 * dont le bivouac est une simple option).
 */
export function isSubtypeRequired(
  typeIds: readonly string[],
  types: readonly Pick<SpotType, 'id' | 'subtype_optional'>[],
  subtypes: readonly Pick<SpotSubtype, 'spot_type_id' | 'is_active'>[],
): boolean {
  return typeIds.some((typeId) => {
    const type = types.find((candidate) => candidate.id === typeId)
    if (!type || type.subtype_optional) return false
    return subtypes.some((subtype) => subtype.spot_type_id === typeId && subtype.is_active)
  })
}

/** "Bivouac · Tente" pour une précision, "Bivouac" ou "Rails" pour une sous-catégorie simple. */
export function subtypeFullLabel(
  subtype: Pick<SpotSubtype, 'label' | 'parent_id'>,
  subtypes: readonly Pick<SpotSubtype, 'id' | 'label'>[],
): string {
  const parent = subtype.parent_id ? subtypes.find((candidate) => candidate.id === subtype.parent_id) : undefined
  return parent ? `${parent.label} · ${subtype.label}` : subtype.label
}
