import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Images, LoaderCircle } from 'lucide-react'
import { Notice } from '@/components/Notice'
import { tooManyPhotosMessage, usePhotoSelection, type PhotoDraft } from '@/features/photos/hooks/usePhotoSelection'
import { usePhotoUpload } from '@/features/photos/hooks/usePhotoUpload'

interface AddPhotosProps {
  spotId: string
  /** Nombre de photos que le spot peut encore recevoir. */
  remaining: number
  /** Nombre maximal de photos par spot, pour les messages. */
  maxPhotos: number
}

/**
 * Ajout de photos à un spot existant : dès qu'elles sont choisies, elles
 * sont préparées puis envoyées. Une photo en échec peut être relancée.
 */
export function AddPhotos({ spotId, remaining, maxPhotos }: AddPhotosProps) {
  const libraryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const selection = usePhotoSelection()
  const upload = usePhotoUpload()

  // Photos de l'envoi en cours ou du dernier envoi, pour pouvoir relancer celles qui ont échoué.
  const [batch, setBatch] = useState<PhotoDraft[]>([])
  // Nombre de photos écartées au dernier choix parce que la limite du spot était atteinte.
  const [rejected, setRejected] = useState(0)
  const full = remaining <= 0

  const failed = batch.filter((photo) => upload.states[photo.key]?.status === 'failed')
  const doneCount = batch.filter((photo) => upload.states[photo.key]?.status === 'done').length
  const busy = selection.isProcessing || upload.isRunning

  async function send(photos: PhotoDraft[]) {
    if (photos.length === 0) return
    setBatch(photos)
    await upload.upload(spotId, photos)
  }

  const handleFiles = (fromCamera: boolean) => async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? [])
    // Vide le champ : choisir à nouveau le même fichier doit redéclencher l'événement.
    event.target.value = ''
    setBatch([])
    // On ne prépare que ce que le spot peut encore recevoir.
    const files = chosen.slice(0, Math.max(remaining, 0))
    setRejected(chosen.length - files.length)
    await send(await selection.addFiles(files, fromCamera))
  }

  const tileClasses =
    'flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-mist text-base font-semibold text-ink active:bg-line disabled:opacity-60'

  return (
    <div className="space-y-3">
      <input ref={libraryInput} type="file" accept="image/*" multiple hidden onChange={handleFiles(false)} data-testid="add-library-input" />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles(true)} data-testid="add-camera-input" />

      <div className="flex gap-3">
        <button type="button" disabled={busy || full} onClick={() => libraryInput.current?.click()} className={tileClasses}>
          <Images className="size-5" aria-hidden="true" />
          Ajouter des photos
        </button>
        <button
          type="button"
          disabled={busy || full}
          onClick={() => cameraInput.current?.click()}
          aria-label="Prendre une photo"
          className={`${tileClasses} max-w-14`}
        >
          <Camera className="size-5" aria-hidden="true" />
        </button>
      </div>

      {full && !busy && (
        <p className="text-base text-ink-soft">
          Ce spot a atteint la limite de {maxPhotos} photo{maxPhotos > 1 ? 's' : ''}.
        </p>
      )}
      {rejected > 0 && <Notice tone="error">{tooManyPhotosMessage(rejected, maxPhotos)}</Notice>}

      {busy && (
        <p role="status" className="flex items-center gap-2 text-base text-ink-soft">
          <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {selection.isProcessing
            ? 'Préparation des photos…'
            : `Envoi en cours : ${doneCount} sur ${batch.length}. Garde cet écran ouvert.`}
        </p>
      )}

      {selection.problems.map((problem) => (
        <Notice key={problem} tone="error">
          {problem}
        </Notice>
      ))}

      {!busy && failed.length > 0 && (
        <div className="space-y-3">
          <Notice tone="error">
            {failed.length > 1 ? `${failed.length} photos n'ont pas pu être envoyées.` : "Une photo n'a pas pu être envoyée."}{' '}
            {upload.states[failed[0].key]?.error}
          </Notice>
          <button
            type="button"
            onClick={() => void send(failed)}
            className="h-12 w-full rounded-xl bg-blaze text-base font-semibold text-ink active:bg-blaze-deep"
          >
            Réessayer l'envoi
          </button>
        </div>
      )}

      {!busy && batch.length > 0 && failed.length === 0 && doneCount === batch.length && (
        <Notice tone="success">
          {batch.length > 1 ? `${batch.length} photos ajoutées.` : 'Photo ajoutée.'}
        </Notice>
      )}
    </div>
  )
}
