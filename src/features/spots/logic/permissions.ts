/**
 * Ce que l'interface propose à l'utilisateur. Fonctions pures.
 *
 * Ces règles ne protègent rien : elles évitent seulement d'afficher un
 * bouton que la base refuserait. La vraie vérification est faite par les
 * règles RLS (migration 4), qui appliquent exactement la même logique.
 */

interface Viewer {
  userId: string
  isAdmin: boolean
}

/** Modifier les informations d'un spot, choisir sa couverture : son créateur et les admins. */
export function canEditSpot(viewer: Viewer, spot: { created_by: string | null }): boolean {
  return viewer.isAdmin || (spot.created_by !== null && spot.created_by === viewer.userId)
}

/** Supprimer un spot : les admins seulement, car d'autres ont pu y ajouter des photos et des updates. */
export function canDeleteSpot(viewer: Viewer): boolean {
  return viewer.isAdmin
}

/** Supprimer une photo : la personne qui l'a ajoutée et les admins. */
export function canDeletePhoto(viewer: Viewer, photo: { uploaded_by: string | null }): boolean {
  return viewer.isAdmin || (photo.uploaded_by !== null && photo.uploaded_by === viewer.userId)
}
