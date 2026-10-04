/**
 * Dates lues dans les photos. Fonctions pures.
 */

/**
 * Convertit une date EXIF ("2026:09:10 14:30:00") en Date.
 * L'heure EXIF est celle de l'appareil au moment de la prise de vue, sans
 * fuseau : on la lit comme une heure locale. Renvoie null si le texte est
 * absent ou invalide (certains appareils écrivent "0000:00:00 00:00:00").
 */
export function parseExifDate(text: string | null | undefined): Date | null {
  if (!text) return null
  const match = /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(text.trim())
  if (!match) return null
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  if (year < 1990 || month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(year, month - 1, day, hour, minute, second)
  // Un jour inexistant (31 février) serait "corrigé" en silence par Date : on le refuse.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

/** Date au format AAAA-MM-JJ, dans le fuseau de l'appareil. */
export function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** La plus ancienne des dates, ou null s'il n'y en a aucune. */
export function earliestDate(dates: (Date | null)[]): Date | null {
  let earliest: Date | null = null
  for (const date of dates) {
    if (date && (!earliest || date < earliest)) earliest = date
  }
  return earliest
}
