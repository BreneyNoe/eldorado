import { useQuery } from '@tanstack/react-query'
import { reverseGeocode } from '@/features/geocoding/api/reverseGeocode'
import type { AppError } from '@/lib/errors'

/**
 * Adresse du point donné. Ne demande rien tant que `position` est null.
 *
 * Les résultats sont gardés en mémoire : revenir sur un point déjà
 * interrogé ne relance pas de requête.
 */
export function useReverseGeocode(position: { lat: number; lng: number } | null) {
  // Arrondi à 5 décimales (environ 1 m) : deux points quasi identiques partagent la même réponse.
  const lat = position ? Number(position.lat.toFixed(5)) : null
  const lng = position ? Number(position.lng.toFixed(5)) : null

  return useQuery<string | null, AppError>({
    queryKey: ['geocode', 'reverse', lat, lng],
    queryFn: ({ signal }) => reverseGeocode(lat!, lng!, signal),
    enabled: lat !== null && lng !== null,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    retry: false,
  })
}
