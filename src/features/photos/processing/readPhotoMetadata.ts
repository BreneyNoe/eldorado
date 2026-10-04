/**
 * Lecture de la localisation et de la date contenues dans une photo (EXIF).
 *
 * À faire AVANT toute compression : redessiner une image sur un canevas
 * efface ses métadonnées.
 *
 * Limite à connaître : Safari sur iPhone retire souvent la localisation des
 * photos choisies dans la photothèque (sauf si l'utilisateur l'autorise dans
 * le menu "Options" du sélecteur), et une photo prise depuis le champ
 * d'envoi n'en contient pas. Une photo sans localisation n'est donc pas une
 * erreur : c'est le cas courant, et le placement manuel prend le relais.
 */
import ExifReader from 'exifreader'
import { isValidCoordinate } from '@/features/map/logic/mapView'
import { parseExifDate } from '@/features/photos/logic/exifDate'
import type { LatLng } from '@/features/spots/logic/geo'

export interface PhotoMetadata {
  /** Lieu de la prise de vue, s'il figure dans la photo. */
  gps: LatLng | null
  /** Date de la prise de vue, si elle figure dans la photo. */
  takenAt: Date | null
}

const NO_METADATA: PhotoMetadata = { gps: null, takenAt: null }

/** Lit les métadonnées dans le contenu brut d'un fichier. Ne lève jamais. */
export function readMetadataFromBuffer(buffer: ArrayBuffer): PhotoMetadata {
  try {
    const tags = ExifReader.load(buffer, { expanded: true })

    const lat = tags.gps?.Latitude
    const lng = tags.gps?.Longitude
    // (0, 0) : valeur écrite par certains appareils qui n'avaient pas encore de signal GPS.
    const hasPosition = isValidCoordinate(lat, lng) && !(lat === 0 && lng === 0)

    const dateText = tags.exif?.DateTimeOriginal?.description ?? tags.exif?.DateTime?.description
    return {
      gps: hasPosition ? { lat: lat as number, lng: lng as number } : null,
      takenAt: parseExifDate(dateText),
    }
  } catch {
    // Format non reconnu ou fichier sans métadonnées.
    return NO_METADATA
  }
}

export async function readPhotoMetadata(file: Blob): Promise<PhotoMetadata> {
  try {
    return readMetadataFromBuffer(await file.arrayBuffer())
  } catch {
    return NO_METADATA
  }
}
