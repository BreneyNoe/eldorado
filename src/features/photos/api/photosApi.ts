/**
 * Envoi d'une photo : deux fichiers dans le stockage, puis une ligne en base.
 * Toutes les fonctions lèvent une AppError en cas d'échec.
 */
import { STORAGE_BUCKET } from '@/config/constants'
import { photoPaths } from '@/features/photos/logic/photoPaths'
import { toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { SpotPhoto } from '@/types/models'

/** Durée de mise en cache par le navigateur : un an. Un fichier envoyé ne change jamais. */
const CACHE_SECONDS = '31536000'

export interface UploadPhotoInput {
  spotId: string
  /** Identifiant de la photo, généré par l'application : il nomme les deux fichiers. */
  photoId: string
  standard: Blob
  thumb: Blob
  /** Dimensions de l'image standard. */
  width: number
  height: number
  takenAt: Date | null
}

async function uploadFile(path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: CACHE_SECONDS,
    upsert: false,
  })
  if (error) throw toAppError(error)
}

/** Supprime des fichiers sans jamais lever : sert à nettoyer après un échec. */
async function removeFilesQuietly(paths: string[]): Promise<void> {
  try {
    await supabase.storage.from(STORAGE_BUCKET).remove(paths)
  } catch {
    // Un fichier resté seul sera repéré par l'outil d'administration (fichiers orphelins).
  }
}

/**
 * Envoie l'image standard et la miniature, puis enregistre la photo.
 * Si une étape échoue, les fichiers déjà envoyés sont retirés : on ne
 * laisse pas de fichier sans ligne en base.
 */
export async function uploadSpotPhoto(input: UploadPhotoInput): Promise<SpotPhoto> {
  const paths = photoPaths(input.spotId, input.photoId)

  await uploadFile(paths.standard, input.standard)

  try {
    await uploadFile(paths.thumb, input.thumb)

    const { data, error } = await supabase
      .from('spot_photos')
      .insert({
        id: input.photoId,
        spot_id: input.spotId,
        path_standard: paths.standard,
        path_thumb: paths.thumb,
        width: input.width,
        height: input.height,
        size_bytes: input.standard.size + input.thumb.size,
        taken_at: input.takenAt?.toISOString() ?? null,
      })
      .select('*')
      .single()
    if (error) throw toAppError(error)
    return data
  } catch (error) {
    await removeFilesQuietly([paths.standard, paths.thumb])
    throw toAppError(error)
  }
}
