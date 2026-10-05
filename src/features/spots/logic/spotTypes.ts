/**
 * Types d'un spot : son type principal et ses types supplémentaires.
 * Fonctions pures.
 */
import type { SpotType } from '@/types/models'

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
