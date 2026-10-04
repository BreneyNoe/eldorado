import { useState } from 'react'
import { Icon } from '@iconify/react'
import { ArrowLeft, CalendarDays, Copy, Map as MapIcon, MapPin, Pencil, UserRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { SheetLayout } from '@/components/SheetLayout'
import { useCurrentUser } from '@/features/auth/hooks/AuthContext'
import { AddPhotos } from '@/features/photos/components/AddPhotos'
import { PhotoViewer } from '@/features/photos/components/PhotoViewer'
import { useMaxPhotosPerSpot } from '@/features/photos/hooks/useMaxPhotosPerSpot'
import { RatingsSection } from '@/features/ratings/components/RatingsSection'
import type { SpotPhotoWithAuthor } from '@/features/spots/api/spotDetailApi'
import { SpotIcon } from '@/features/spots/components/SpotIcon'
import { SpotTypeBadge } from '@/features/spots/components/SpotTypeBadge'
import { useDeleteSpotPhoto, useSetCoverPhoto, useSpot, useSpotPhotos } from '@/features/spots/hooks/useSpotDetail'
import { useSpotSubtypes, useSpotTypes } from '@/features/spots/hooks/useSpotQueries'
import { directionsUrl } from '@/features/spots/logic/directions'
import { canDeletePhoto, canEditSpot } from '@/features/spots/logic/permissions'
import { UNKNOWN_TYPE_COLOR } from '@/features/spots/logic/spotIcons'
import { UpdatesSection } from '@/features/updates/components/UpdatesSection'
import { formatDay, formatInstantDay } from '@/lib/formatDate'
import { publicPhotoUrl } from '@/lib/storageUrls'

const ROUND_OVERLAY =
  'flex size-12 items-center justify-center rounded-full bg-paper text-ink shadow-[0_2px_8px_rgb(22_35_59/0.28)] active:bg-mist'

/** Fiche complète d'un spot. */
export function SpotScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { session, isAdmin } = useCurrentUser()
  const viewer = { userId: session.userId, isAdmin }

  const spotQuery = useSpot(id)
  const photosQuery = useSpotPhotos(id)
  const typesQuery = useSpotTypes()
  const { maxPhotos, isLoading: limitLoading } = useMaxPhotosPerSpot()
  const subtypesQuery = useSpotSubtypes()
  const setCover = useSetCoverPhoto(id)
  const deletePhoto = useDeleteSpotPhoto()

  // Photo ouverte dans la visionneuse (repérée par son id : la liste peut changer pendant qu'elle est ouverte).
  const [viewedPhotoId, setViewedPhotoId] = useState<string | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<SpotPhotoWithAuthor | null>(null)
  const [copied, setCopied] = useState(false)

  /** Retour à l'écran d'où l'on vient ; à la carte si la fiche a été ouverte directement. */
  const goBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (historyIndex > 0) void navigate(-1)
    else void navigate(`/?spot=${encodeURIComponent(id)}`, { replace: true })
  }

  // Hors ligne, une fiche jamais consultée n'est pas en mémoire.
  if (spotQuery.isPending && spotQuery.fetchStatus === 'paused') {
    return (
      <SheetLayout title="Fiche indisponible hors ligne" back={{ to: '/', label: 'Carte' }}>
        <p className="text-lg">
          Cette fiche n'a pas été ouverte récemment sur cet appareil. Elle s'affichera dès que la connexion sera
          revenue.
        </p>
      </SheetLayout>
    )
  }
  if (spotQuery.isPending) return <FullScreenLoader />

  if (spotQuery.error) {
    return (
      <SheetLayout title="Chargement impossible" back={{ to: '/', label: 'Carte' }}>
        <p className="text-lg">{spotQuery.error.message}</p>
        <div className="mt-8">
          <Button onClick={() => void spotQuery.refetch()}>Réessayer</Button>
        </div>
      </SheetLayout>
    )
  }

  const spot = spotQuery.data
  if (!spot) {
    return (
      <SheetLayout title="Spot introuvable" back={{ to: '/', label: 'Carte' }}>
        <p className="text-lg">Ce spot n'existe pas ou a été supprimé.</p>
      </SheetLayout>
    )
  }

  const type = typesQuery.data?.find((candidate) => candidate.id === spot.spot_type_id)
  const photos = photosQuery.data ?? []
  const cover = photos.find((photo) => photo.id === spot.cover_photo_id) ?? photos[0]
  const editable = canEditSpot(viewer, spot)
  const viewedIndex = photos.findIndex((photo) => photo.id === viewedPhotoId)

  const visitedOn = formatDay(spot.visited_on)
  const createdOn = formatInstantDay(spot.created_at)
  const coordinates = `${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}`

  async function copyCoordinates() {
    try {
      await navigator.clipboard.writeText(coordinates)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Presse-papiers indisponible (adresse non sécurisée) : les coordonnées restent lisibles à l'écran.
    }
  }

  function confirmDeletePhoto() {
    if (!photoToDelete) return
    deletePhoto.mutate(photoToDelete, {
      onSuccess: () => {
        setPhotoToDelete(null)
        // On reste dans la visionneuse sur une photo voisine, ou on la ferme s'il n'en reste plus.
        const remaining = photos.filter((photo) => photo.id !== photoToDelete.id)
        const next = remaining[Math.min(viewedIndex, remaining.length - 1)]
        setViewedPhotoId(next ? next.id : null)
      },
    })
  }

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-paper">
      {/* Couverture : la miniature, déjà en mémoire, sert de fond le temps que l'image standard arrive. */}
      <div className="relative">
        {cover ? (
          <button
            type="button"
            onClick={() => setViewedPhotoId(cover.id)}
            aria-label="Ouvrir la photo de couverture"
            className="block aspect-[4/3] w-full bg-mist bg-cover bg-center"
            style={{ backgroundImage: `url("${publicPhotoUrl(cover.path_thumb)}")` }}
          >
            <img
              src={publicPhotoUrl(cover.path_standard) ?? undefined}
              alt={`Photo de couverture de ${spot.name}`}
              className="size-full object-cover"
            />
          </button>
        ) : (
          <div
            className="flex aspect-[5/2] w-full items-center justify-center text-paper"
            style={{ backgroundColor: type?.color ?? UNKNOWN_TYPE_COLOR }}
            aria-hidden="true"
          >
            <SpotIcon name={type?.icon} className="size-14" />
          </div>
        )}

        <div className="safe-top safe-x pointer-events-none absolute inset-x-0 top-0">
          <div className="flex justify-between p-3">
            <button type="button" onClick={goBack} aria-label="Retour" className={`pointer-events-auto ${ROUND_OVERLAY}`}>
              <ArrowLeft className="size-6" aria-hidden="true" />
            </button>
            {editable && (
              <Link to={`/spot/${spot.id}/edit`} aria-label="Modifier le spot" className={`pointer-events-auto ${ROUND_OVERLAY}`}>
                <Pencil className="size-5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="safe-x">
        <div className="mx-auto w-full max-w-md space-y-7 px-4 pt-5 pb-10">
          <header>
            <SpotTypeBadge type={type} subtype={subtypesQuery.data?.find((candidate) => candidate.id === spot.subtype_id)} />
            <h1 className="mt-2 text-3xl leading-tight font-semibold">{spot.name}</h1>

            <ul className="mt-4 space-y-2 text-base">
              {spot.address && (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-ink-soft" aria-hidden="true" />
                  <span>{spot.address}</span>
                </li>
              )}
              {visitedOn && (
                <li className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 size-5 shrink-0 text-ink-soft" aria-hidden="true" />
                  <span>Visité le {visitedOn}</span>
                </li>
              )}
              <li className="flex items-start gap-3 text-ink-soft">
                <UserRound className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>
                  Ajouté par {spot.creator?.display_name ?? 'un utilisateur supprimé'}
                  {createdOn && ` le ${createdOn}`}
                </span>
              </li>
            </ul>
          </header>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to={`/?spot=${encodeURIComponent(spot.id)}`}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-mist text-base font-semibold text-ink active:bg-line"
            >
              <MapIcon className="size-5" aria-hidden="true" />
              Voir sur la carte
            </Link>
            {/* Ouvre Google Maps avec l'itinéraire vers le spot. */}
            <a
              href={directionsUrl(spot.lat, spot.lng)}
              target="_blank"
              rel="noreferrer"
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blaze text-base font-semibold text-ink active:bg-blaze-deep"
            >
              <Icon icon="gcp:google-maps-platform" className="size-5" aria-hidden="true" />
              Y aller
            </a>
          </div>

          {spot.description && (
            <section aria-labelledby="spot-description">
              <h2 id="spot-description" className="text-xl font-semibold">
                Description
              </h2>
              {/* Le texte est affiché tel quel, sauts de ligne compris, jamais interprété comme du HTML. */}
              <p className="mt-2 text-lg break-words whitespace-pre-line">{spot.description}</p>
            </section>
          )}

          <UpdatesSection spotId={spot.id} viewer={viewer} />

          <RatingsSection spotId={spot.id} spotTypeId={spot.spot_type_id} userId={session.userId} />

          <section aria-labelledby="spot-photos">
            <h2 id="spot-photos" className="text-xl font-semibold">
              Photos{photos.length > 0 && ` (${photos.length})`}
            </h2>
            {photosQuery.error && <p className="mt-2 text-base text-danger">{photosQuery.error.message}</p>}
            {photos.length > 0 ? (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => setViewedPhotoId(photo.id)}
                      aria-label={`Ouvrir la photo ${index + 1}`}
                      className="block aspect-square w-full overflow-hidden rounded-xl bg-mist"
                    >
                      <img
                        src={publicPhotoUrl(photo.path_thumb) ?? undefined}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              !photosQuery.isPending && <p className="mt-2 text-base text-ink-soft">Aucune photo pour l'instant.</p>
            )}
            <div className="mt-3">
              {/* Proposé une fois la limite et les photos existantes connues, pour calculer la place restante. */}
              {!limitLoading && !photosQuery.isPending && (
                <AddPhotos spotId={spot.id} remaining={maxPhotos - photos.length} maxPhotos={maxPhotos} />
              )}
            </div>
          </section>

          <section aria-labelledby="spot-position">
            <h2 id="spot-position" className="text-xl font-semibold">
              Position
            </h2>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-lg">{coordinates}</p>
              <button
                type="button"
                onClick={() => void copyCoordinates()}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-mist px-4 text-base font-semibold active:bg-line"
              >
                <Copy className="size-4" aria-hidden="true" />
                <span aria-live="polite">{copied ? 'Copié' : 'Copier'}</span>
              </button>
            </div>
          </section>
        </div>
      </main>

      {viewedIndex >= 0 && (
        <PhotoViewer
          photos={photos}
          index={viewedIndex}
          onIndexChange={(index) => {
            setCover.reset()
            setViewedPhotoId(photos[index]?.id ?? null)
          }}
          onClose={() => {
            setCover.reset()
            setViewedPhotoId(null)
          }}
          coverPhotoId={cover?.id ?? null}
          canSetCover={editable}
          canDelete={(photo) => canDeletePhoto(viewer, photo)}
          onSetCover={(photo) => setCover.mutate(photo.id)}
          onDelete={(photo) => {
            deletePhoto.reset()
            setPhotoToDelete(photo)
          }}
          busy={setCover.isPending}
          error={setCover.error?.message}
        />
      )}

      {photoToDelete && (
        <ConfirmDialog
          title="Supprimer cette photo ?"
          confirmLabel="Supprimer la photo"
          busy={deletePhoto.isPending}
          error={deletePhoto.error?.message}
          onConfirm={confirmDeletePhoto}
          onCancel={() => setPhotoToDelete(null)}
        >
          Elle sera retirée du spot pour tout le monde. Cette action est définitive.
        </ConfirmDialog>
      )}
    </div>
  )
}
