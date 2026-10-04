/** "3,5" : virgule française, sans décimale inutile ("4", "0,5"). Fonction pure. */
export function formatRating(value: number): string {
  return String(value).replace('.', ',')
}
