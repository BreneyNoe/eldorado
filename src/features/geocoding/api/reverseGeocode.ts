/**
 * Recherche de l'adresse d'un point ("reverse geocoding") auprès de Nominatim.
 *
 * Seul fichier qui connaît ce fournisseur : en changer revient à réécrire
 * ce fichier et formatAddress, sans toucher aux écrans.
 *
 * Règles d'usage du service public de Nominatim, respectées ici :
 *   - une requête par seconde au maximum ;
 *   - aucune recherche en rafale ni autocomplétion ;
 *   - le navigateur transmet de lui-même l'adresse du site appelant.
 */
import { getEnv } from '@/config/env'
import { formatAddress, type NominatimResult } from '@/features/geocoding/logic/formatAddress'
import { AppError, toAppError } from '@/lib/errors'

/** Délai minimal entre deux requêtes, en millisecondes (un peu plus d'une seconde). */
const MIN_INTERVAL_MS = 1100

let lastRequestAt = 0

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Annulé', 'AbortError'))
      },
      { once: true },
    )
  })
}

/**
 * Adresse lisible du point, ou null si le service n'en connaît pas à cet endroit.
 * Lève une AppError si le service est injoignable.
 */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  // On patiente si la requête précédente est trop récente.
  const delay = lastRequestAt + MIN_INTERVAL_MS - Date.now()
  if (delay > 0) await wait(delay, signal)
  lastRequestAt = Date.now()

  const url = new URL(`${getEnv().geocoderUrl}/reverse`)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', lat.toFixed(6))
  url.searchParams.set('lon', lng.toFixed(6))
  url.searchParams.set('zoom', '18')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'fr')

  let response: Response
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    // Requête annulée parce que le repère a encore bougé : ce n'est pas une erreur.
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw toAppError(error)
  }

  if (response.status === 429) {
    throw new AppError('rate_limit', "Le service d'adresses est saturé. Réessaie dans un instant.")
  }
  if (!response.ok) {
    throw new AppError('unknown', "Le service d'adresses ne répond pas correctement.", {
      code: String(response.status),
    })
  }

  return formatAddress((await response.json()) as NominatimResult)
}
