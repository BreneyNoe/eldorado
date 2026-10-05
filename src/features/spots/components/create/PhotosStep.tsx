import { useRef, type ChangeEvent } from 'react'
import { Camera, Images, LoaderCircle, MapPin, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import type { PhotoDraft } from '@/features/photos/hooks/usePhotoSelection'
import { ImportLocation } from '@/features/spots/components/create/ImportLocation'
import type { ResolvedPosition } from '@/features/spots/api/resolveMapLink'

interface PhotosStepProps {
  photos: PhotoDraft[]
  /** Des photos sont encore en cours de lecture. */
  isProcessing: boolean
  /** Fichiers écartés, avec la raison. */
  problems: string[]
  /** Nombre maximal de photos par spot. */
  maxPhotos: number
  /** `fromCamera` : la photo vient d'être prise avec l'appareil. */
  onAddFiles: (files: File[], fromCamera: boolean) => void
  onRemove: (key: string) => void
  /** Position reprise de Google Maps (coordonnées ou lien collés), ou null. */
  importedPosition: ResolvedPosition | null
  onImportPosition: (position: ResolvedPosition | null) => void
  onContinue: () => void
  onCancel: () => void
}

/**
 * Première étape de la création : les photos (facultatives).
 * Si elles contiennent leur position, le spot sera placé tout seul.
 */
export function PhotosStep({
  photos,
  isProcessing,
  maxPhotos,
  problems,
  onAddFiles,
  onRemove,
  importedPosition,
  onImportPosition,
  onContinue,
  onCancel,
}: PhotosStepProps) {
  const libraryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  const handleFiles = (fromCamera: boolean) => (event: ChangeEvent<HTMLInputElement>) => {
    onAddFiles(Array.from(event.target.files ?? []), fromCamera)
    // Vide le champ : choisir à nouveau le même fichier doit redéclencher l'événement.
    event.target.value = ''
  }

  const locatedCount = photos.filter((photo) => photo.gps !== null).length

  let positionLine: string | null = null
  if (photos.length > 0 && !isProcessing) {
    positionLine =
      locatedCount === 0
        ? 'Aucune position dans ces photos : tu placeras le spot sur la carte.'
        : `Position trouvée dans ${locatedCount} photo${locatedCount > 1 ? 's' : ''} sur ${photos.length}.`
  }

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="safe-top safe-x shrink-0 border-b border-line">
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-2 py-2">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Annuler la création"
            className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-mist"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-semibold">Nouveau spot</h1>
        </div>
      </header>

      <main className="safe-x min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-md space-y-5 px-4 pt-5 pb-6">
          <p className="text-lg">
            Commence par les photos. Si elles contiennent leur position, le spot sera placé tout seul sur la carte.
          </p>

          {/* Champs de fichier masqués, ouverts par les deux boutons. "capture" demande
              directement l'appareil photo ; sans lui, iOS propose la photothèque. */}
          <input
            ref={libraryInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFiles(false)}
            data-testid="library-input"
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={handleFiles(true)}
            data-testid="camera-input"
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => libraryInput.current?.click()}
              className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 border-line text-base font-semibold active:bg-mist"
            >
              <Images className="size-7" aria-hidden="true" />
              Photothèque
            </button>
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 border-line text-base font-semibold active:bg-mist"
            >
              <Camera className="size-7" aria-hidden="true" />
              Prendre une photo
            </button>
          </div>

          {photos.length >= maxPhotos && (
            <p className="text-base text-ink-soft">
              Limite atteinte : {maxPhotos} photo{maxPhotos > 1 ? 's' : ''} par spot.
            </p>
          )}

          <ImportLocation value={importedPosition} onChange={onImportPosition} />

          {problems.map((problem) => (
            <Notice key={problem} tone="error">
              {problem}
            </Notice>
          ))}

          {(photos.length > 0 || isProcessing) && (
            <ul className="grid grid-cols-3 gap-2" aria-label="Photos choisies">
              {photos.map((photo, index) => (
                <li key={photo.key} className="relative aspect-square overflow-hidden rounded-xl bg-mist">
                  <img src={photo.previewUrl} alt={`Photo ${index + 1}`} className="size-full object-cover" />
                  {photo.gps && (
                    <span
                      className="absolute bottom-1.5 left-1.5 flex size-7 items-center justify-center rounded-full bg-ink/75 text-paper"
                      title="Cette photo contient sa position"
                    >
                      <MapPin className="size-4" aria-hidden="true" />
                      <span className="sr-only">Contient sa position</span>
                    </span>
                  )}
                  {index === 0 && (
                    <span className="absolute right-1.5 bottom-1.5 rounded-full bg-blaze px-2 py-0.5 text-sm font-semibold text-ink">
                      Couverture
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(photo.key)}
                    aria-label={`Retirer la photo ${index + 1}`}
                    className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-ink/75 text-paper active:bg-ink"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {isProcessing && (
                <li className="flex aspect-square items-center justify-center rounded-xl bg-mist" role="status">
                  <LoaderCircle className="size-7 animate-spin text-ink-soft motion-reduce:animate-none" aria-hidden="true" />
                  <span className="sr-only">Lecture des photos en cours</span>
                </li>
              )}
            </ul>
          )}

          {positionLine && (
            <p className="flex items-start gap-2 text-base text-ink-soft" aria-live="polite">
              <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              {positionLine}
            </p>
          )}
        </div>
      </main>

      <div className="safe-bottom safe-x shrink-0 border-t border-line">
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <Button onClick={onContinue} disabled={isProcessing}>
            {photos.length === 0 && !isProcessing ? 'Continuer sans photo' : 'Continuer'}
          </Button>
        </div>
      </div>
    </div>
  )
}
