import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { IMAGE_SETTINGS } from '@/config/constants'
import { uploadSpotPhoto } from '@/features/photos/api/photosApi'
import type { PhotoDraft } from '@/features/photos/hooks/usePhotoSelection'
import { compressImage } from '@/features/photos/processing/compressImage'
import { toAppError } from '@/lib/errors'
import { createUuid } from '@/lib/uuid'

export type UploadStatus = 'waiting' | 'working' | 'done' | 'failed'

export interface UploadState {
  status: UploadStatus
  /** Message lisible en cas d'échec. */
  error?: string
}

/**
 * Envoi des photos d'un spot, l'une après l'autre, dans l'ordre choisi (la
 * première devient la photo de couverture).
 *
 * Une photo qui échoue n'arrête pas les suivantes : on peut relancer
 * seulement celles qui ont échoué.
 */
export function usePhotoUpload() {
  const queryClient = useQueryClient()
  const [states, setStates] = useState<Record<string, UploadState>>({})
  const [isRunning, setIsRunning] = useState(false)
  // Copie à jour des états, lisible depuis la boucle d'envoi.
  const statesRef = useRef<Record<string, UploadState>>({})

  const setState = (key: string, state: UploadState) => {
    statesRef.current = { ...statesRef.current, [key]: state }
    setStates(statesRef.current)
  }

  /**
   * Envoie les photos qui ne sont pas encore parties (ou qui ont échoué).
   * @returns le nombre de photos en échec à la fin
   */
  const upload = useCallback(
    async (spotId: string, photos: PhotoDraft[]): Promise<number> => {
      setIsRunning(true)
      try {
        for (const photo of photos) {
          if (statesRef.current[photo.key]?.status === 'done') continue
          setState(photo.key, { status: 'working' })
          try {
            // L'image standard n'est fabriquée qu'au moment de l'envoi, une photo
            // à la fois : on ne garde jamais plusieurs grandes images en mémoire.
            const standard = await compressImage(
              photo.file,
              IMAGE_SETTINGS.standardMaxEdge,
              IMAGE_SETTINGS.standardQuality,
            )
            await uploadSpotPhoto({
              spotId,
              // Nouvel identifiant à chaque tentative : un essai interrompu ne bloque pas le suivant.
              photoId: createUuid(),
              standard: standard.blob,
              thumb: photo.thumb.blob,
              width: standard.width,
              height: standard.height,
              takenAt: photo.takenAt,
            })
            setState(photo.key, { status: 'done' })
          } catch (error) {
            setState(photo.key, { status: 'failed', error: toAppError(error).message })
          }
        }
      } finally {
        setIsRunning(false)
        // La liste des spots porte la miniature de couverture : on la rafraîchit.
        void queryClient.invalidateQueries({ queryKey: ['spots'] })
      }
      return photos.filter((photo) => statesRef.current[photo.key]?.status === 'failed').length
    },
    [queryClient],
  )

  return { states, isRunning, upload }
}
