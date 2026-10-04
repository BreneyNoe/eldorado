/**
 * Filtres appliqués aux spots, sur la carte comme dans la liste.
 *
 * Pour ajouter un filtre plus tard (distance, accessibilité...) :
 *   1. ajouter un champ à SpotFilters et sa valeur neutre à EMPTY_FILTERS ;
 *   2. ajouter une ligne dans applyFilters.
 * La carte et la liste le prennent alors en compte sans autre changement.
 *
 * Fonctions pures, sans dépendance à React.
 */
import type { SpotLight } from '@/types/models'

export interface SpotFilters {
  /** Types retenus. Vide = tous les types. */
  typeIds: string[]
  /** Texte recherché dans le nom. Vide = pas de recherche. */
  search: string
}

export const EMPTY_FILTERS: SpotFilters = { typeIds: [], search: '' }

/** Minuscules, sans accents, espaces réduits : "  Étang  Bleu " -> "etang bleu". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Vrai si le nom contient tous les mots de la recherche, sans tenir compte des accents ni de la casse. */
export function matchesSearch(name: string, search: string): boolean {
  const query = normalizeText(search)
  if (!query) return true
  const haystack = normalizeText(name)
  return query.split(' ').every((word) => haystack.includes(word))
}

export function hasActiveFilters(filters: SpotFilters): boolean {
  return filters.typeIds.length > 0 || normalizeText(filters.search) !== ''
}

export function applyFilters(spots: SpotLight[], filters: SpotFilters): SpotLight[] {
  if (!hasActiveFilters(filters)) return spots
  const typeIds = new Set(filters.typeIds)

  return spots.filter(
    (spot) =>
      (typeIds.size === 0 || typeIds.has(spot.spot_type_id)) && matchesSearch(spot.name, filters.search),
  )
}

/**
 * Coche ou décoche un type.
 * Quand tous les types proposés se retrouvent cochés, on revient à "tous"
 * (liste vide) : c'est le même résultat, et un nouveau type ajouté plus
 * tard ne sera pas exclu par surprise.
 */
export function toggleType(selected: string[], typeId: string, availableTypeIds: string[]): string[] {
  const next = selected.includes(typeId)
    ? selected.filter((id) => id !== typeId)
    : [...selected, typeId]

  const coversEverything =
    availableTypeIds.length > 0 && availableTypeIds.every((id) => next.includes(id))
  return coversEverything ? [] : next
}
