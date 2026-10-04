/**
 * Lit toutes les lignes d'une requête, page par page.
 *
 * Supabase renvoie au plus 1 000 lignes par requête. Sans cette boucle, le
 * 1 001e spot disparaîtrait silencieusement de la carte.
 *
 * @param fetchPage  lit les lignes de `from` à `to` inclus
 * @param pageSize   taille d'une page (1 000 = limite par défaut de Supabase)
 * @param maxPages   garde-fou contre une boucle sans fin
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
  maxPages = 50,
): Promise<T[]> {
  const rows: T[] = []
  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize
    const batch = await fetchPage(from, from + pageSize - 1)
    rows.push(...batch)
    // Une page incomplète est forcément la dernière.
    if (batch.length < pageSize) break
  }
  return rows
}
