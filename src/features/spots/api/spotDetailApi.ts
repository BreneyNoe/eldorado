/**
 * Fiche d'un spot : lecture complète, modification, suppression, photos.
 * Toutes les fonctions lèvent une AppError en cas d'échec.
 */
import { STORAGE_BUCKET } from '@/config/constants'
import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { AddressSource, Spot, SpotPhoto } from '@/types/models'

/** Un spot complet, avec le nom affiché de son créateur (null si le compte a été supprimé). */
export interface SpotDetail extends Spot {
  creator: { display_name: string } | null
}

/** Une photo, avec le nom affiché de la personne qui l'a ajoutée. */
export interface SpotPhotoWithAuthor extends SpotPhoto {
  uploader: { display_name: string } | null
}

/** Le spot, ou null s'il n'existe pas (ou plus). */
export async function fetchSpot(spotId: string): Promise<SpotDetail | null> {
  const { data, error } = await supabase
    .from('spots')
    .select(
      'id, spot_type_id, name, description, lat, lng, address, address_source, visited_on, created_by, cover_photo_id, subtype_id, created_at, updated_at, creator:profiles(display_name)',
    )
    .eq('id', spotId)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}

/** Photos du spot, de la plus ancienne à la plus récente. */
export async function fetchSpotPhotos(spotId: string): Promise<SpotPhotoWithAuthor[]> {
  const { data, error } = await supabase
    .from('spot_photos')
    .select(
      'id, spot_id, uploaded_by, path_standard, path_thumb, width, height, size_bytes, taken_at, created_at, uploader:profiles(display_name)',
    )
    .eq('spot_id', spotId)
    .order('created_at')
    .order('id')
  if (error) throw toAppError(error)
  return data
}

export interface SpotChanges {
  name: string
  description: string | null
  lat: number
  lng: number
  address: string | null
  addressSource: AddressSource
  /** Date au format AAAA-MM-JJ. */
  visitedOn: string | null
  subtypeId: string | null
}

/** Modifie les informations d'un spot (réservé à son créateur et aux admins : la base le vérifie). */
export async function updateSpot(spotId: string, changes: SpotChanges): Promise<void> {
  const { data, error } = await supabase
    .from('spots')
    .update({
      name: changes.name,
      description: changes.description,
      lat: changes.lat,
      lng: changes.lng,
      address: changes.address,
      address_source: changes.addressSource,
      visited_on: changes.visitedOn,
      subtype_id: changes.subtypeId,
    })
    .eq('id', spotId)
    .select('id')
  if (error) throw toAppError(error)
  // Aucune ligne modifiée : la base a refusé en silence (droits insuffisants) ou le spot n'existe plus.
  if (data.length === 0) throw toAppError({ code: '42501', message: 'spot update refused' })
}

/** Choisit la photo de couverture du spot (créateur et admins). */
export async function setCoverPhoto(spotId: string, photoId: string): Promise<void> {
  const { data, error } = await supabase.from('spots').update({ cover_photo_id: photoId }).eq('id', spotId).select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) throw toAppError({ code: '42501', message: 'cover update refused' })
}

/** Retire des fichiers du stockage sans jamais lever : un fichier resté seul sera repéré par l'outil d'administration. */
async function removeFilesQuietly(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  try {
    await supabase.storage.from(STORAGE_BUCKET).remove(paths)
  } catch {
    // Volontairement ignoré.
  }
}

/**
 * Supprime une photo (son auteur et les admins).
 *
 * La ligne en base est supprimée d'abord, les fichiers ensuite : si le
 * second temps échoue, il reste des fichiers sans ligne (invisibles, et
 * nettoyables), jamais une ligne pointant vers une image disparue.
 */
export async function deleteSpotPhoto(photo: Pick<SpotPhoto, 'id' | 'path_standard' | 'path_thumb'>): Promise<void> {
  const { data, error } = await supabase.from('spot_photos').delete().eq('id', photo.id).select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) throw toAppError({ code: '42501', message: 'photo delete refused' })
  await removeFilesQuietly([photo.path_standard, photo.path_thumb])
}

/**
 * Supprime un spot avec ses photos, notes et updates (admins uniquement).
 * La base supprime les lignes liées ; les fichiers des photos sont retirés ensuite.
 */
export async function deleteSpot(spotId: string): Promise<void> {
  // Les chemins sont relevés avant : une fois le spot supprimé, la base ne les connaît plus.
  const photos = await fetchSpotPhotos(spotId)

  const { data, error } = await supabase.from('spots').delete().eq('id', spotId).select('id')
  if (error) throw toAppError(error)
  if (data.length === 0) throw toAppError({ code: '42501', message: 'spot delete refused' })

  await removeFilesQuietly(photos.flatMap((photo) => [photo.path_standard, photo.path_thumb]))
}
