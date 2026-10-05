import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { SheetLayout } from '@/components/SheetLayout'
import { useCurrentUser } from '@/features/auth/hooks/AuthContext'
import { useReverseGeocode } from '@/features/geocoding/hooks/useReverseGeocode'
import type { SpotDetail } from '@/features/spots/api/spotDetailApi'
import { DetailsStep } from '@/features/spots/components/create/DetailsStep'
import { PositionStep } from '@/features/spots/components/create/PositionStep'
import { useDeleteSpot, useSpot, useUpdateSpot } from '@/features/spots/hooks/useSpotDetail'
import { useSpotSubtypes, useSpotTypes } from '@/features/spots/hooks/useSpotQueries'
import { canDeleteSpot, canEditSpot } from '@/features/spots/logic/permissions'
import {
  effectiveAddress,
  emptyDraft,
  validateSpotDraft,
  type SpotDraft,
  type SpotDraftErrors,
} from '@/features/spots/logic/spotDraft'
import type { SpotType } from '@/types/models'

const STEP_PARAM = 'etape'
const POSITION_STEP = 'position'
const EDIT_ZOOM = 17

/** Brouillon de départ : les informations actuelles du spot. */
function draftFromSpot(spot: SpotDetail): SpotDraft {
  return {
    ...emptyDraft(),
    lat: spot.lat,
    lng: spot.lng,
    spotTypeId: spot.spot_type_id,
    extraTypeIds: (spot.extra_types ?? []).map((entry) => entry.spot_type_id),
    subtypeId: spot.subtype_id,
    name: spot.name,
    description: spot.description ?? '',
    address: spot.address ?? '',
    // L'adresse actuelle est conservée telle quelle tant que le spot n'est pas déplacé.
    addressEdited: true,
    visitedOn: spot.visited_on ?? '',
    visitedOnEdited: true,
  }
}

/** Chargement du spot, puis formulaire. Séparés pour que le brouillon parte d'un spot déjà connu. */
export function EditSpotScreen() {
  const { id = '' } = useParams()
  const { session, isAdmin } = useCurrentUser()
  const spotQuery = useSpot(id)
  const typesQuery = useSpotTypes()

  if (spotQuery.isPending || typesQuery.isPending) return <FullScreenLoader />

  const spot = spotQuery.data
  if (spotQuery.error || !spot) {
    return (
      <SheetLayout title={spotQuery.error ? 'Chargement impossible' : 'Spot introuvable'} back={{ to: '/', label: 'Carte' }}>
        <p className="text-lg">{spotQuery.error?.message ?? "Ce spot n'existe pas ou a été supprimé."}</p>
      </SheetLayout>
    )
  }

  if (!canEditSpot({ userId: session.userId, isAdmin }, spot)) {
    return (
      <SheetLayout title="Modification impossible" back={{ to: `/spot/${spot.id}`, label: 'Fiche' }}>
        <p className="text-lg">Seuls la personne qui a créé ce spot et les administrateurs peuvent le modifier.</p>
      </SheetLayout>
    )
  }

  const type = typesQuery.data?.find((candidate) => candidate.id === spot.spot_type_id)
  return <EditSpotForm spot={spot} type={type} canDelete={canDeleteSpot({ userId: session.userId, isAdmin })} />
}

interface EditSpotFormProps {
  spot: SpotDetail
  type: SpotType | undefined
  canDelete: boolean
}

function EditSpotForm({ spot, type, canDelete }: EditSpotFormProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const subtypes = useSpotSubtypes().data ?? []
  const allTypes = useSpotTypes().data ?? []
  const updateSpot = useUpdateSpot(spot.id)
  const deleteSpot = useDeleteSpot(spot.id)

  const [draft, setDraft] = useState<SpotDraft>(() => draftFromSpot(spot))
  const [errors, setErrors] = useState<SpotDraftErrors>({})
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const moved = draft.lat !== spot.lat || draft.lng !== spot.lng
  // On ne cherche une nouvelle adresse que si le spot a été déplacé et que l'adresse n'a pas été saisie à la main.
  const geocode = useReverseGeocode(moved && !draft.addressEdited ? { lat: draft.lat!, lng: draft.lng! } : null)
  const suggestedAddress = geocode.data ?? null
  const addressValue = effectiveAddress(draft, suggestedAddress)

  const updateDraft = (changes: Partial<SpotDraft>) => {
    setDraft((current) => ({ ...current, ...changes }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(changes)) delete next[key as keyof SpotDraftErrors]
      return next
    })
    if (updateSpot.isError) updateSpot.reset()
  }

  if (searchParams.get(STEP_PARAM) === POSITION_STEP) {
    return (
      <PositionStep
        initialView={{ lat: draft.lat!, lng: draft.lng!, zoom: EDIT_ZOOM }}
        excludeSpotId={spot.id}
        backLabel="Revenir au formulaire"
        confirmLabel="Valider la position"
        onConfirm={(position) => {
          const changed = position.lat !== draft.lat || position.lng !== draft.lng
          updateDraft({
            ...position,
            // Spot déplacé : une adresse trouvée automatiquement est recalculée,
            // une adresse saisie à la main est conservée.
            ...(changed && spot.address_source === 'auto' ? { addressEdited: false } : {}),
          })
          void navigate(-1)
        }}
        onBack={() => void navigate(-1)}
      />
    )
  }

  function handleSubmit() {
    const validation = validateSpotDraft({ ...draft, address: addressValue })
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    const address = addressValue.trim() || null
    // "auto" si l'adresse vient du service d'adresses, ou si elle est restée celle d'origine, elle-même automatique.
    const unchanged = address === spot.address
    const addressSource = !draft.addressEdited ? 'auto' : unchanged ? spot.address_source : 'manual'

    updateSpot.mutate(
      {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        lat: draft.lat!,
        lng: draft.lng!,
        address,
        addressSource: address ? addressSource : 'auto',
        visitedOn: draft.visitedOn || null,
        subtypeId: draft.subtypeId,
        extraTypeIds: draft.extraTypeIds,
      },
      { onSuccess: () => void navigate(-1) },
    )
  }

  return (
    <>
      <DetailsStep
        draft={draft}
        addressValue={addressValue}
        addressPending={moved && !draft.addressEdited && geocode.isPending}
        types={allTypes}
        subtypes={subtypes}
        categories={[]}
        lockedType={type}
        title="Modifier le spot"
        submitLabel="Enregistrer"
        errors={errors}
        submitError={updateSpot.error?.message ?? null}
        isSubmitting={updateSpot.isPending}
        onChange={updateDraft}
        onSubmit={handleSubmit}
        onBack={() => void navigate(-1)}
        onEditPosition={() => setSearchParams({ [STEP_PARAM]: POSITION_STEP })}
        footer={
          canDelete && (
            <div className="border-t border-line pt-6">
              <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                Supprimer le spot
              </Button>
            </div>
          )
        }
      />

      {confirmingDelete && (
        <ConfirmDialog
          title="Supprimer ce spot ?"
          confirmLabel="Supprimer le spot"
          busy={deleteSpot.isPending}
          error={deleteSpot.error?.message}
          onConfirm={() => deleteSpot.mutate(undefined, { onSuccess: () => void navigate('/', { replace: true }) })}
          onCancel={() => setConfirmingDelete(false)}
        >
          « {spot.name} » sera supprimé pour tout le monde, avec ses photos, ses notes et ses updates. Cette action
          est définitive.
        </ConfirmDialog>
      )}
    </>
  )
}
