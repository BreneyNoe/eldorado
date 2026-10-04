import { useCallback, useEffect, useRef, useState } from 'react'
import { IMAGE_SETTINGS } from '@/config/constants'
import { compressImage, type CompressedImage } from '@/features/photos/processing/compressImage'
import { readPhotoMetadata } from '@/features/photos/processing/readPhotoMetadata'
import type { LatLng } from '@/features/spots/logic/geo'
import { createUuid } from '@/lib/uuid'

/** Une photo choisie, prête à être envoyée plus tard. */
export interface PhotoDraft {
  /** Identifiant local, le temps de la saisie. */
  key: string
  /** Fichier d'origine, gardé pour fabriquer l'image standard au moment de l'envoi. */
  file: File
  /** Miniature déjà fabriquée : elle sert d'aperçu, puis sera envoyée telle quelle. */
  thumb: CompressedImage
  /** Adresse locale de la miniature, pour l'afficher. */
  previewUrl: string
  gps: LatLng | null
  /**
   * D'où vient la position : "photo" si elle était inscrite dans le fichier,
   * "device" si c'est celle du téléphone au moment où la photo a été prise.
   */
  gpsSource: 'photo' | 'device' | null
  takenAt: Date | null
}

/** Message affiché quand des photos sont écartées parce que le plafond est atteint. Fonction pure. */
export function tooManyPhotosMessage(rejected: number, max: number): string {
  const limit = `${max} photo${max > 1 ? 's' : ''} au maximum par spot`
  return rejected > 1 ? `${limit} : ${rejected} photos n'ont pas été ajoutées.` : `${limit} : une photo n'a pas été ajoutée.`
}

/** Délai maximal accordé au téléphone pour donner sa position, en millisecondes. */
const DEVICE_POSITION_TIMEOUT_MS = 8000

/**
 * Position actuelle du téléphone, ou null si elle est refusée, indisponible
 * ou trop longue à obtenir. Ne lève jamais : c'est un simple bonus.
 */
function currentDevicePosition(): Promise<LatLng | null> {
  if (!window.isSecureContext || !('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (result) => resolve({ lat: result.coords.latitude, lng: result.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: DEVICE_POSITION_TIMEOUT_MS },
    )
  })
}

function looksLikeImage(file: File): boolean {
  // Certains navigateurs ne renseignent pas le type des fichiers HEIC : on regarde aussi l'extension.
  return file.type.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp|avif)$/i.test(file.name)
}

/**
 * Photos choisies pendant la création d'un spot.
 *
 * Chaque photo est traitée l'une après l'autre : lecture de sa position et
 * de sa date, puis fabrication de sa miniature. Les traiter une par une
 * évite de saturer la mémoire d'un iPhone avec plusieurs grandes images.
 */
/**
 * @param maxPhotos  nombre maximal de photos dans la sélection. Les fichiers en trop
 *                   sont écartés, avec un message. Sans valeur : pas de plafond.
 */
export function usePhotoSelection(maxPhotos?: number) {
  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  // Nombre de photos retenues ou en cours de lecture : tenu à jour sans attendre
  // l'affichage, pour que deux ajouts rapprochés ne dépassent pas le plafond.
  const acceptedCount = useRef(0)
  const maxPhotosRef = useRef(maxPhotos)
  useEffect(() => {
    maxPhotosRef.current = maxPhotos
  }, [maxPhotos])
  /** Fichiers écartés, avec la raison, pour en informer l'utilisateur. */
  const [problems, setProblems] = useState<string[]>([])

  // File d'attente : garantit le traitement un par un, même si l'utilisateur
  // ajoute des photos pendant qu'un premier lot est en cours.
  const queue = useRef<Promise<void>>(Promise.resolve())
  const mounted = useRef(true)
  const previewUrls = useRef(new Set<string>())

  useEffect(() => {
    mounted.current = true
    const urls = previewUrls.current
    return () => {
      mounted.current = false
      for (const url of urls) URL.revokeObjectURL(url)
      urls.clear()
    }
  }, [])

  /**
   * @param fromCamera  la photo vient d'être prise avec l'appareil photo. Une telle
   *                    photo ne contient jamais sa position sur iPhone : on prend
   *                    alors celle du téléphone, puisqu'on est encore sur place.
   */
  const addFiles = useCallback((chosen: File[], fromCamera = false): Promise<PhotoDraft[]> => {
    if (chosen.length === 0) return Promise.resolve([])
    setProblems([])

    // Plafond : on ne garde que ce qui tient encore.
    const max = maxPhotosRef.current
    const room = max === undefined ? chosen.length : Math.max(max - acceptedCount.current, 0)
    const files = chosen.slice(0, room)
    if (files.length < chosen.length && max !== undefined) setProblems([tooManyPhotosMessage(chosen.length - files.length, max)])
    if (files.length === 0) return Promise.resolve([])

    acceptedCount.current += files.length
    setPendingCount((count) => count + files.length)
    // Photos de ce lot une fois prêtes, pour qui veut les envoyer aussitôt.
    const added: PhotoDraft[] = []

    for (const file of files) {
      queue.current = queue.current.then(async () => {
        try {
          if (!looksLikeImage(file)) throw new Error("ce n'est pas une image")
          // La position doit être lue avant toute compression, qui l'effacerait.
          const metadata = await readPhotoMetadata(file)
          const thumb = await compressImage(file, IMAGE_SETTINGS.thumbMaxEdge, IMAGE_SETTINGS.thumbQuality)

          let gps = metadata.gps
          let gpsSource: PhotoDraft['gpsSource'] = gps ? 'photo' : null
          if (!gps && fromCamera) {
            gps = await currentDevicePosition()
            gpsSource = gps ? 'device' : null
          }
          if (!mounted.current) return

          const previewUrl = URL.createObjectURL(thumb.blob)
          previewUrls.current.add(previewUrl)
          const draft: PhotoDraft = {
            key: createUuid(),
            file,
            thumb,
            previewUrl,
            gps,
            gpsSource,
            takenAt: metadata.takenAt,
          }
          added.push(draft)
          setPhotos((current) => [...current, draft])
        } catch {
          if (mounted.current) {
            acceptedCount.current -= 1
          setProblems((current) => [...current, `« ${file.name} » n'a pas pu être lue et a été écartée.`])
          }
        } finally {
          if (mounted.current) setPendingCount((count) => count - 1)
        }
      })
    }
    return queue.current.then(() => added)
  }, [])

  const removePhoto = useCallback((key: string) => {
    acceptedCount.current = Math.max(acceptedCount.current - 1, 0)
    setPhotos((current) => {
      const removed = current.find((photo) => photo.key === key)
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
        previewUrls.current.delete(removed.previewUrl)
      }
      return current.filter((photo) => photo.key !== key)
    })
  }, [])

  return { photos, isProcessing: pendingCount > 0, problems, addFiles, removePhoto }
}
