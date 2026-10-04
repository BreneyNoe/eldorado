/**
 * Notes d'un spot : préparation de l'affichage et de l'enregistrement.
 * Fonctions pures.
 *
 * Rappel de la règle : chaque utilisateur a sa propre note par catégorie,
 * et l'on affiche la moyenne de chaque catégorie. Il n'y a jamais de note
 * globale du spot.
 */
import type { RatingCategory, RatingsInput, RatingSummary } from '@/types/models'

/** Une ligne de la section "Notes" d'une fiche. */
export interface RatingRow {
  categoryId: string
  label: string
  /** Moyenne arrondie à une décimale, ou null si personne n'a noté. */
  average: number | null
  votes: number
  /** Note de l'utilisateur connecté, ou null s'il n'a pas noté cette catégorie. */
  mine: number | null
}

/**
 * Une ligne par catégorie active du type du spot, dans l'ordre d'affichage.
 * Les catégories d'un autre type sont ignorées, même si des données en parlent.
 */
export function buildRatingRows(
  spotTypeId: string,
  categories: RatingCategory[],
  summary: Pick<RatingSummary, 'category_id' | 'average' | 'votes'>[],
  myRatings: { category_id: string; value: number }[],
): RatingRow[] {
  const summaryByCategory = new Map(summary.map((entry) => [entry.category_id, entry]))
  const mineByCategory = new Map(myRatings.map((rating) => [rating.category_id, rating.value]))

  return categories
    .filter((category) => category.spot_type_id === spotTypeId && category.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, 'fr'))
    .map((category) => {
      const entry = summaryByCategory.get(category.id)
      const votes = entry?.votes ?? 0
      return {
        categoryId: category.id,
        label: category.label,
        average: votes > 0 && entry ? Number(entry.average) : null,
        votes,
        mine: mineByCategory.get(category.id) ?? null,
      }
    })
}

/** "4,3" : une décimale, virgule française. */
export function formatAverage(average: number): string {
  return average.toFixed(1).replace('.', ',')
}

/** "1 avis", "3 avis" (le mot est invariable). */
export function formatVotes(votes: number): string {
  return `${votes} avis`
}

/**
 * Ce qu'il faut envoyer à la base après une modification de ses notes :
 * uniquement les catégories qui ont changé, avec null pour une note retirée.
 * Renvoie un objet vide si rien n'a changé.
 */
export function ratingChanges(
  before: Record<string, number | null>,
  after: Record<string, number | null>,
): RatingsInput {
  const changes: RatingsInput = {}
  for (const categoryId of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const previous = before[categoryId] ?? null
    const next = after[categoryId] ?? null
    if (previous !== next) changes[categoryId] = next
  }
  return changes
}
