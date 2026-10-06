import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { SheetLayout } from '@/components/SheetLayout'
import { useCurrentUser } from '@/features/auth/hooks/AuthContext'
import { useReverseGeocode } from '@/features/geocoding/hooks/useReverseGeocode'
import { DEFAULT_VIEW } from '@/features/map/logic/mapView'
import { readSavedView } from '@/features/map/logic/viewStorage'
import { UploadProgress } from '@/features/photos/components/UploadProgress'
import { useMaxPhotosPerSpot } from '@/features/photos/hooks/useMaxPhotosPerSpot'
import { usePhotoSelection } from '@/features/photos/hooks/usePhotoSelection'
import { usePhotoUpload } from '@/features/photos/hooks/usePhotoUpload'
import { earliestDate, toIsoDay } from '@/features/photos/logic/exifDate'
import { proposePosition } from '@/features/photos/logic/proposePosition'
import { DetailsStep } from '@/features/spots/components/create/DetailsStep'
import { PhotosStep } from '@/features/spots/components/create/PhotosStep'
import { PositionStep } from '@/features/spots/components/create/PositionStep'
import type { ResolvedPosition } from '@/features/spots/api/resolveMapLink'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import {
  useCreateSpot,
  useRatingCategories,
  useSpotSubtypes,
  useSpotTypes,
} from '@/features/spots/hooks/useSpotQueries'
import {
  addressSourceOf,
  cleanRatings,
  effectiveAddress,
  emptyDraft,
  validateSpotDraft,
  type SpotDraft,
  type SpotDraftErrors,
} from '@/features/spots/logic/spotDraft'
import { allTypeIds, isSubtypeRequired } from '@/features/spots/logic/spotTypes'

const STEP_PARAM = 'etape'
const POSITION_STEP = 'position'
const DETAILS_STEP = 'infos'

/** Zoom appliqué quand la carte de placement s'ouvre sur une position précise. */
const PRECISE_ZOOM = 17
/** Zoom appliqué quand la position de départ n'est qu'approximative. */
const APPROXIMATE_ZOOM = 15

type Step = 'photos' | 'position' | 'details'

/**
 * Création d'un spot en trois étapes : les photos, la position, puis les
 * informations. Les photos sont envoyées une fois le spot créé.
 *
 * L'étape en cours est inscrite dans l'adresse (#/new?etape=position) : le
 * retour en arrière du téléphone ramène à l'étape précédente au lieu de
 * quitter la création, et tout ce qui a été saisi est conservé.
 */
export function CreateSpotScreen() {
  const navigate = useNavigate()
  const { session } = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()

  const typesQuery = useSpotTypes()
  const categoriesQuery = useRatingCategories()
  const subtypesQuery = useSpotSubtypes()
  const createSpot = useCreateSpot()
  const online = useOnlineStatus()
  const { maxPhotos, isLoading: limitLoading } = useMaxPhotosPerSpot()
  const selection = usePhotoSelection(maxPhotos)
  const photoUpload = usePhotoUpload()

  const [draft, setDraft] = useState<SpotDraft>(() => emptyDraft())
  const [errors, setErrors] = useState<SpotDraftErrors>({})
  // Lue une seule fois : sans photo localisée, la création démarre là où l'on regardait la carte.
  const [startView] = useState(() => readSavedView() ?? DEFAULT_VIEW)
  // Renseigné une fois le spot créé : on n'affiche plus alors que l'envoi des photos.
  const [createdSpotId, setCreatedSpotId] = useState<string | null>(null)
  // Vrai pendant qu'on quitte l'écran, pour ne pas réafficher une étape au passage.
  const [leaving, setLeaving] = useState(false)
  // Position reprise de Google Maps (coordonnées ou lien collés à la première étape).
  const [imported, setImported] = useState<ResolvedPosition | null>(null)

  const hasPosition = draft.lat !== null && draft.lng !== null
  const stepParam = searchParams.get(STEP_PARAM)
  let step: Step = 'photos'
  if (stepParam === DETAILS_STEP && hasPosition) step = 'details'
  else if (stepParam === POSITION_STEP || stepParam === DETAILS_STEP) step = 'position'

  // Page ouverte ou rechargée directement sur une étape avancée : le brouillon
  // est vide, on repart du début en remettant l'adresse en accord.
  const [startedMidway] = useState(() => stepParam !== null)
  const startChecked = useRef(false)
  useEffect(() => {
    // Une seule fois, à l'ouverture de l'écran : ensuite, l'adresse suit les étapes normalement.
    if (startChecked.current) return
    startChecked.current = true
    if (startedMidway) setSearchParams({}, { replace: true })
  }, [startedMidway, setSearchParams])

  // --- Ce que les photos nous apprennent ------------------------------------
  const { photos } = selection
  const proposal = useMemo(() => proposePosition(photos.map((photo) => photo.gps)), [photos])
  const photoDate = useMemo(() => earliestDate(photos.map((photo) => photo.takenAt)), [photos])
  const visitedOnFromPhotos = photoDate !== null && !draft.visitedOnEdited

  let positionNotice: string | null = null
  if (imported) {
    positionNotice = imported.approximate
      ? 'Google Maps n\u2019a donné qu\u2019une position approximative du lieu.'
      : 'Position reprise de Google Maps.'
  } else if (proposal) {
    const onlyDevice = photos.every((photo) => photo.gps === null || photo.gpsSource === 'device')
    positionNotice = onlyDevice ? 'Position de ton téléphone au moment de la photo.' : proposal.explanation
  } else if (photos.length > 0) {
    positionNotice = `${photos.length > 1 ? 'Ces photos ne contiennent' : 'Cette photo ne contient'} pas de position : place le repère à la main.`
  }

  // Adresse proposée pour la position retenue. La carte de placement a déjà
  // posé la même question : la réponse vient en général de la mémoire.
  const geocode = useReverseGeocode(hasPosition ? { lat: draft.lat!, lng: draft.lng! } : null)
  const suggestedAddress = geocode.data ?? null
  const addressValue = effectiveAddress(draft, suggestedAddress)

  const updateDraft = (changes: Partial<SpotDraft>) => {
    setDraft((current) => ({ ...current, ...changes }))
    // Un champ corrigé n'affiche plus son message d'erreur.
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(changes)) delete next[key as keyof SpotDraftErrors]
      return next
    })
    if (createSpot.isError) createSpot.reset()
  }

  /**
   * Quitte la création vers la carte, centrée sur le nouveau spot, sans
   * laisser d'étape de création dans l'historique : un retour en arrière
   * depuis la carte ne doit pas rouvrir le formulaire.
   */
  function leaveToSpot(spotId: string) {
    const target = `/?spot=${encodeURIComponent(spotId)}`
    setLeaving(true)

    // Nombre d'entrées ajoutées à l'historique par les étapes, d'après l'adresse actuelle.
    const current = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get(STEP_PARAM)
    const entriesToDrop = current === DETAILS_STEP ? 2 : current === POSITION_STEP ? 1 : 0

    if (entriesToDrop === 0) {
      void navigate(target, { replace: true })
      return
    }
    // On recule jusqu'à la première entrée de la création, puis on la remplace.
    const onPop = () => {
      window.removeEventListener('popstate', onPop)
      void navigate(target, { replace: true })
    }
    window.addEventListener('popstate', onPop)
    window.history.go(-entriesToDrop)
  }

  /** Envoie les photos du spot créé, puis ouvre la carte si tout est passé. */
  async function sendPhotos(spotId: string) {
    const failedCount = await photoUpload.upload(spotId, photos)
    if (failedCount === 0) leaveToSpot(spotId)
  }

  function handleSubmit() {
    // Un type qui propose des sous-catégories en exige une à la création, sauf s'il les rend facultatives (Nature).
    const subtypeRequired = isSubtypeRequired(
      allTypeIds(draft.spotTypeId, draft.extraTypeIds),
      typesQuery.data ?? [],
      subtypesQuery.data ?? [],
    )
    const validation = validateSpotDraft({ ...draft, address: addressValue }, new Date(), { subtypeRequired })
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    createSpot.mutate(
      {
        spotTypeId: draft.spotTypeId!,
        subtypeId: draft.subtypeId,
        extraTypeIds: draft.extraTypeIds,
        name: draft.name.trim(),
        lat: draft.lat!,
        lng: draft.lng!,
        description: draft.description.trim() || null,
        address: addressValue.trim() || null,
        addressSource: addressSourceOf(addressValue, suggestedAddress),
        visitedOn: draft.visitedOn || null,
        ratings: cleanRatings(draft.ratings),
        createdBy: session.userId,
      },
      {
        onSuccess: (spotId) => {
          if (photos.length === 0) {
            leaveToSpot(spotId)
            return
          }
          // Le spot existe désormais : on passe à l'envoi des photos.
          setCreatedSpotId(spotId)
          void sendPhotos(spotId)
        },
      },
    )
  }

  /** Passage de l'étape des photos à la carte de placement. */
  function goToPosition() {
    // La date de visite suit celle des photos, tant que l'utilisateur ne l'a pas choisie lui-même.
    if (photoDate && !draft.visitedOnEdited) updateDraft({ visitedOn: toIsoDay(photoDate) })
    setSearchParams({ [STEP_PARAM]: POSITION_STEP })
  }

  if (leaving) return <FullScreenLoader />

  // Créer un spot demande le réseau (adresse, doublons, envoi). On le dit dès
  // le départ ; une création déjà commencée, elle, n'est pas interrompue.
  if (!online && !createdSpotId && step === 'photos' && photos.length === 0) {
    return (
      <SheetLayout title="Création impossible hors ligne" back={{ to: '/', label: 'Carte' }}>
        <p className="text-lg">Reviens quand la connexion sera rétablie : la création d'un spot a besoin du réseau.</p>
      </SheetLayout>
    )
  }

  if (createdSpotId) {
    return (
      <UploadProgress
        photos={photos}
        states={photoUpload.states}
        isRunning={photoUpload.isRunning}
        onRetry={() => void sendPhotos(createdSpotId)}
        onFinish={() => leaveToSpot(createdSpotId)}
      />
    )
  }

  if (step === 'photos') {
    // La limite de photos est lue avant de proposer d'en choisir.
    if (limitLoading) return <FullScreenLoader />

    return (
      <PhotosStep
        photos={photos}
        isProcessing={selection.isProcessing}
        problems={selection.problems}
        maxPhotos={maxPhotos}
        onAddFiles={selection.addFiles}
        onRemove={selection.removePhoto}
        // La position reprise est retenue sans quitter l'écran : on peut encore ajouter des photos.
        importedPosition={imported}
        onImportPosition={setImported}
        onContinue={goToPosition}
        onCancel={() => void navigate('/', { replace: true })}
      />
    )
  }

  if (step === 'position') {
    // Priorité : la position déjà choisie, sinon celle reprise de Google Maps,
    // sinon celle des photos, sinon là où l'on regardait la carte.
    let initialView = startView
    if (hasPosition) {
      initialView = { lat: draft.lat!, lng: draft.lng!, zoom: Math.max(startView.zoom, PRECISE_ZOOM) }
    } else if (imported) {
      // Position approximative : vue plus large, pour retrouver le lieu autour du repère.
      initialView = { lat: imported.lat, lng: imported.lng, zoom: imported.approximate ? APPROXIMATE_ZOOM : PRECISE_ZOOM }
    } else if (proposal) {
      initialView = { ...proposal.position, zoom: PRECISE_ZOOM }
    }

    return (
      <PositionStep
        initialView={initialView}
        notice={hasPosition ? null : positionNotice}
        onConfirm={(position) => {
          updateDraft(position)
          if (stepParam !== DETAILS_STEP) setSearchParams({ [STEP_PARAM]: DETAILS_STEP })
        }}
        onBack={() => void navigate(-1)}
      />
    )
  }

  if (typesQuery.isPending || categoriesQuery.isPending || subtypesQuery.isPending) return <FullScreenLoader />

  const loadError = typesQuery.error ?? categoriesQuery.error ?? subtypesQuery.error

  return (
    <DetailsStep
      draft={draft}
      addressValue={addressValue}
      addressPending={geocode.isPending}
      visitedOnFromPhotos={visitedOnFromPhotos}
      types={typesQuery.data ?? []}
      subtypes={subtypesQuery.data ?? []}
      categories={categoriesQuery.data ?? []}
      errors={errors}
      submitError={createSpot.error?.message ?? loadError?.message ?? null}
      isSubmitting={createSpot.isPending}
      onChange={updateDraft}
      onSubmit={handleSubmit}
      onBack={() => void navigate(-1)}
    />
  )
}
