/**
 * Lien "Y aller" : itinéraire vers un point dans Google Maps.
 *
 * C'est un simple lien, sans clé ni compte : il n'utilise pas l'API payante
 * de Google. Sur iPhone, il ouvre l'application Google Maps si elle est
 * installée, sinon le site dans le navigateur.
 *
 * Pour changer d'application d'itinéraire, c'est la seule fonction à modifier.
 */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
