import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import type { SpotPhotoWithAuthor } from '@/features/spots/api/spotDetailApi'
import { formatInstantDay } from '@/lib/formatDate'
import { publicPhotoUrl } from '@/lib/storageUrls'

interface PhotoViewerProps {
  photos: SpotPhotoWithAuthor[]
  /** Position de la photo affichée dans `photos`. */
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  /** Id de la photo de couverture du spot. */
  coverPhotoId: string | null
  /** L'utilisateur peut choisir la couverture (créateur du spot ou admin). */
  canSetCover: boolean
  canDelete: (photo: SpotPhotoWithAuthor) => boolean
  onSetCover: (photo: SpotPhotoWithAuthor) => void
  onDelete: (photo: SpotPhotoWithAuthor) => void
  /** Une action (couverture) est en cours. */
  busy?: boolean
  error?: string | null
}

/** Distance horizontale (en pixels) à partir de laquelle un glissement change de photo. */
const SWIPE_DISTANCE = 50

/**
 * Visionneuse plein écran. La miniature, déjà chargée, s'affiche tout de
 * suite ; l'image standard la recouvre dès qu'elle est arrivée.
 */
export function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  coverPhotoId,
  canSetCover,
  canDelete,
  onSetCover,
  onDelete,
  busy = false,
  error,
}: PhotoViewerProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const swipeStart = useRef<number | null>(null)
  // Photo dont l'image standard a fini de charger : tant que ce n'est pas la photo affichée, la miniature reste visible.
  const [loadedId, setLoadedId] = useState<string | null>(null)

  const photo = photos[index]
  const hasPrevious = index > 0
  const hasNext = index < photos.length - 1

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && hasPrevious) onIndexChange(index - 1)
      if (event.key === 'ArrowRight' && hasNext) onIndexChange(index + 1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [index, hasPrevious, hasNext, onClose, onIndexChange])

  if (!photo) return null

  const isCover = photo.id === coverPhotoId
  const deletable = canDelete(photo)
  const addedOn = formatInstantDay(photo.created_at)

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    swipeStart.current = event.clientX
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (swipeStart.current === null) return
    const delta = event.clientX - swipeStart.current
    swipeStart.current = null
    if (delta > SWIPE_DISTANCE && hasPrevious) onIndexChange(index - 1)
    if (delta < -SWIPE_DISTANCE && hasNext) onIndexChange(index + 1)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} sur ${photos.length}`}
      className="fixed inset-0 z-50 flex flex-col bg-ink text-paper"
    >
      <div className="safe-top safe-x shrink-0">
        <div className="flex items-center justify-between px-2 py-2">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer la photo"
            className="flex size-12 items-center justify-center rounded-full active:bg-paper/15"
          >
            <X className="size-7" aria-hidden="true" />
          </button>
          <p className="text-lg font-medium" aria-hidden="true">
            {index + 1} / {photos.length}
          </p>
          <span className="size-12" aria-hidden="true" />
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-pan-y select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          swipeStart.current = null
        }}
      >
        <img
          src={publicPhotoUrl(photo.path_thumb) ?? undefined}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-contain"
        />
        <img
          key={photo.id}
          src={publicPhotoUrl(photo.path_standard) ?? undefined}
          alt={`Photo ${index + 1} du spot`}
          onLoad={() => setLoadedId(photo.id)}
          draggable={false}
          className={`absolute inset-0 size-full object-contain transition-opacity duration-200 ${
            loadedId === photo.id ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {hasPrevious && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            aria-label="Photo précédente"
            className="absolute top-1/2 left-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-ink/55 active:bg-ink/80"
          >
            <ChevronLeft className="size-7" aria-hidden="true" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            aria-label="Photo suivante"
            className="absolute top-1/2 right-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-ink/55 active:bg-ink/80"
          >
            <ChevronRight className="size-7" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="safe-bottom safe-x shrink-0">
        <div className="mx-auto w-full max-w-md space-y-3 px-4 pt-3 pb-4">
          <p className="flex items-center gap-2.5 text-base text-paper/80">
            <Avatar person={photo.uploader} size="sm" />
            <span>
            Ajoutée par {photo.uploader?.display_name ?? 'un utilisateur supprimé'}
            {addedOn && ` le ${addedOn}`}
            {isCover && ' · Photo de couverture'}
            </span>
          </p>
          {error && (
            <p role="alert" className="rounded-xl bg-paper px-4 py-3 text-base font-medium text-danger">
              {error}
            </p>
          )}
          {((canSetCover && !isCover) || deletable) && (
            <div className="flex gap-3">
              {canSetCover && !isCover && (
                <button
                  type="button"
                  onClick={() => onSetCover(photo)}
                  disabled={busy}
                  className="h-12 flex-1 rounded-xl bg-paper/15 px-3 text-base font-semibold active:bg-paper/25 disabled:opacity-60"
                >
                  Mettre en couverture
                </button>
              )}
              {deletable && (
                <button
                  type="button"
                  onClick={() => onDelete(photo)}
                  disabled={busy}
                  className="h-12 flex-1 rounded-xl bg-paper px-3 text-base font-semibold text-danger active:bg-mist disabled:opacity-60"
                >
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
