import { Check, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/Button'
import { SheetLayout } from '@/components/SheetLayout'
import type { PhotoDraft } from '@/features/photos/hooks/usePhotoSelection'
import type { UploadState } from '@/features/photos/hooks/usePhotoUpload'

interface UploadProgressProps {
  photos: PhotoDraft[]
  states: Record<string, UploadState>
  isRunning: boolean
  /** Relance l'envoi des photos en échec. */
  onRetry: () => void
  /** Termine sans les photos en échec. */
  onFinish: () => void
}

/** Écran affiché pendant l'envoi des photos, après la création du spot. */
export function UploadProgress({ photos, states, isRunning, onRetry, onFinish }: UploadProgressProps) {
  const doneCount = photos.filter((photo) => states[photo.key]?.status === 'done').length
  const failed = photos.filter((photo) => states[photo.key]?.status === 'failed')

  return (
    <SheetLayout
      title={isRunning ? 'Envoi des photos' : failed.length > 0 ? 'Envoi incomplet' : 'Photos envoyées'}
      subtitle={`${doneCount} sur ${photos.length}`}
    >
      <p className="text-lg">
        {isRunning
          ? 'Le spot est créé. Garde cet écran ouvert pendant l\u2019envoi.'
          : failed.length > 0
            ? `Le spot est créé, mais ${failed.length > 1 ? `${failed.length} photos n'ont` : "une photo n'a"} pas pu être envoyée${failed.length > 1 ? 's' : ''}.`
            : 'Le spot et ses photos sont enregistrés.'}
      </p>

      <ul className="mt-6 grid grid-cols-4 gap-2" aria-label="Avancement de chaque photo">
        {photos.map((photo, index) => {
          const state = states[photo.key]?.status ?? 'waiting'
          const label = { waiting: 'en attente', working: 'envoi en cours', done: 'envoyée', failed: 'échec' }[state]
          return (
            <li key={photo.key} className="relative aspect-square overflow-hidden rounded-xl bg-mist">
              <img src={photo.previewUrl} alt="" className="size-full object-cover" />
              <span className="sr-only">
                Photo {index + 1} : {label}
              </span>
              {state !== 'waiting' && (
                <span
                  className={`absolute inset-0 flex items-center justify-center ${
                    state === 'done' ? 'bg-ok/45' : state === 'failed' ? 'bg-danger/55' : 'bg-ink/45'
                  } text-paper`}
                  aria-hidden="true"
                >
                  {state === 'working' && <LoaderCircle className="size-7 animate-spin motion-reduce:animate-none" />}
                  {state === 'done' && <Check className="size-7" strokeWidth={3} />}
                  {state === 'failed' && <TriangleAlert className="size-7" />}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {!isRunning && failed.length > 0 && (
        <div className="mt-6 space-y-3">
          <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-base font-medium text-danger">
            {states[failed[0].key]?.error}
          </p>
          <Button onClick={onRetry}>Réessayer l'envoi</Button>
          <Button variant="secondary" onClick={onFinish}>
            Terminer sans {failed.length > 1 ? 'ces photos' : 'cette photo'}
          </Button>
        </div>
      )}
    </SheetLayout>
  )
}
