/**
 * Règles et mises en forme de l'administration. Fonctions pures.
 */

/** Espace de stockage du plan gratuit de Supabase : 1 Go. */
export const STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024

/**
 * Fabrique une clé technique à partir d'un libellé : "Plans inclinés" ->
 * "plans_inclines". La base n'accepte que des minuscules sans accent, des
 * chiffres et des tirets bas, en commençant par une lettre (2 à 31 caractères).
 */
export function slugifyKey(label: string): string {
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[0-9_]+/, '')
    .slice(0, 31)
    .replace(/_+$/, '')
  return slug.length >= 2 ? slug : ''
}

/** Clé libre dans une liste : "rails", puis "rails_2", "rails_3"... */
export function uniqueKey(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base.slice(0, 27)}_${suffix}`
    if (!used.has(candidate)) return candidate
  }
  return base
}

/** Ordre d'affichage d'un nouvel élément : après tous les autres. */
export function nextSortOrder(items: { sort_order: number }[]): number {
  return items.reduce((highest, item) => Math.max(highest, item.sort_order), 0) + 10
}

/** "512 o", "340 Ko", "12,4 Mo", "1,02 Go". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 o'
  if (bytes < 1024) return `${Math.round(bytes)} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',')} Go`
}

/** Part du quota utilisée, de 0 à 100 (plafonnée). */
export function quotaPercent(bytes: number, quota: number = STORAGE_QUOTA_BYTES): number {
  if (quota <= 0 || bytes <= 0) return 0
  return Math.min(100, Math.round((bytes / quota) * 100))
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

/** Message d'erreur, ou null si le libellé est valide (1 à 40 caractères, espaces de bord exclus). */
export function validateLabel(label: string): string | null {
  const length = label.trim().length
  if (length < 1) return 'Le libellé est obligatoire.'
  if (length > 40) return 'Le libellé ne peut pas dépasser 40 caractères.'
  return null
}

/** Nombre maximal de photos par spot : un entier entre 1 et 50. */
export function validatePhotoLimit(value: string): string | null {
  if (!/^\d+$/.test(value.trim())) return 'Saisis un nombre entier.'
  const limit = Number(value)
  if (limit < 1 || limit > 50) return 'Le nombre doit être compris entre 1 et 50.'
  return null
}

/** Rayon de détection des doublons : un entier entre 1 et 5 000 mètres. */
export function validateRadius(value: string): string | null {
  if (!/^\d+$/.test(value.trim())) return 'Saisis un nombre entier de mètres.'
  const radius = Number(value)
  if (radius < 1 || radius > 5000) return 'Le rayon doit être compris entre 1 et 5 000 mètres.'
  return null
}
