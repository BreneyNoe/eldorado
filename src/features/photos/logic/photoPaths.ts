/**
 * Chemins des deux fichiers d'une photo dans le stockage.
 * Ils sont imposés par la base (contraintes de la table spot_photos) :
 * toute autre forme serait refusée.
 */
export function photoPaths(spotId: string, photoId: string): { standard: string; thumb: string } {
  const base = `spots/${spotId}/${photoId}`
  return { standard: `${base}_std.jpg`, thumb: `${base}_thumb.jpg` }
}
