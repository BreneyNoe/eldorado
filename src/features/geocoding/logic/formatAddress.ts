/**
 * Transforme la réponse du service d'adresses (Nominatim) en une adresse
 * courte et lisible. Fonction pure.
 */
import { TEXT_LIMITS } from '@/config/constants'

/** Partie utile de la réponse de Nominatim (format "jsonv2"). */
export interface NominatimResult {
  error?: string
  display_name?: string
  address?: Record<string, string | undefined>
}

function firstOf(address: Record<string, string | undefined>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = address[key]?.trim()
    if (value) return value
  }
  return undefined
}

/**
 * Adresse du type "Rue, Commune, Département". Renvoie null si le service
 * n'a rien trouvé à cet endroit (en pleine mer, par exemple).
 */
export function formatAddress(result: NominatimResult | null | undefined): string | null {
  if (!result || result.error) return null
  const address = result.address ?? {}

  const road = firstOf(address, ['road', 'pedestrian', 'footway', 'path', 'cycleway', 'track'])
  const street = road && address.house_number ? `${address.house_number.trim()} ${road}` : road
  // Du plus précis au plus large : lieu-dit, puis commune.
  const place = firstOf(address, ['hamlet', 'isolated_dwelling', 'locality', 'neighbourhood'])
  const town = firstOf(address, ['village', 'town', 'city', 'municipality'])
  // En France, "county" est le département.
  const area = firstOf(address, ['county', 'state_district', 'state'])
  const country = address.country_code && address.country_code !== 'fr' ? address.country?.trim() : undefined

  const parts: string[] = []
  for (const part of [street ?? place, town, area, country]) {
    // Pas de répétition ("Lyon, Lyon").
    if (part && !parts.includes(part)) parts.push(part)
  }

  const text = parts.length > 0 ? parts.join(', ') : (result.display_name?.trim() ?? '')
  if (!text) return null
  return text.slice(0, TEXT_LIMITS.spotAddress.max)
}
