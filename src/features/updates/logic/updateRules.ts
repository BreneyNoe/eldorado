/**
 * Journal d'updates d'un spot : validation et règles d'affichage.
 * Fonctions pures.
 */
import { TEXT_LIMITS } from '@/config/constants'

interface Viewer {
  userId: string
  isAdmin: boolean
}

interface UpdateLike {
  author_id: string | null
  created_at: string
  updated_at: string
}

/** Message d'erreur, ou null si le texte est publiable. Les espaces en début et fin ne comptent pas. */
export function validateUpdateBody(body: string): string | null {
  const length = body.trim().length
  if (length < TEXT_LIMITS.updateBody.min) return 'Écris quelque chose avant de publier.'
  if (length > TEXT_LIMITS.updateBody.max) {
    return `Un update ne peut pas dépasser ${TEXT_LIMITS.updateBody.max} caractères.`
  }
  return null
}

/** Modifier le texte d'un update : son auteur uniquement (même un admin ne réécrit pas les propos d'un autre). */
export function canEditUpdate(viewer: Viewer, update: UpdateLike): boolean {
  return update.author_id !== null && update.author_id === viewer.userId
}

/** Supprimer un update : son auteur et les admins. */
export function canDeleteUpdate(viewer: Viewer, update: UpdateLike): boolean {
  return viewer.isAdmin || (update.author_id !== null && update.author_id === viewer.userId)
}

/** Écart, en millisecondes, à partir duquel un update est signalé comme "modifié". */
const EDIT_THRESHOLD_MS = 60_000

/**
 * Vrai si le texte a été modifié après sa publication. Un petit écart est
 * toléré : les deux dates sont posées par la base à quelques instants près.
 */
export function wasEdited(update: UpdateLike): boolean {
  const created = new Date(update.created_at).getTime()
  const updated = new Date(update.updated_at).getTime()
  if (Number.isNaN(created) || Number.isNaN(updated)) return false
  return updated - created > EDIT_THRESHOLD_MS
}
