/**
 * Mise en forme des dates en français. Fonctions pures.
 */

const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * "10 septembre 2026" à partir d'une date seule au format AAAA-MM-JJ.
 * La date est lue telle quelle, sans décalage de fuseau horaire.
 */
export function formatDay(isoDay: string | null | undefined): string | null {
  if (!isoDay) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDay)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : DAY_FORMAT.format(date)
}

/** "10 septembre 2026" à partir d'un instant (date et heure avec fuseau), dans le fuseau de l'appareil. */
export function formatInstantDay(isoInstant: string | null | undefined): string | null {
  if (!isoInstant) return null
  const date = new Date(isoInstant)
  return Number.isNaN(date.getTime()) ? null : DAY_FORMAT.format(date)
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** "10 septembre 2026 à 14:30" à partir d'un instant, dans le fuseau de l'appareil. */
export function formatInstantDateTime(isoInstant: string | null | undefined): string | null {
  if (!isoInstant) return null
  const date = new Date(isoInstant)
  return Number.isNaN(date.getTime()) ? null : DATE_TIME_FORMAT.format(date)
}
