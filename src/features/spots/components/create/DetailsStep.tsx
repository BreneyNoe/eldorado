import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { StarRatingInput } from '@/components/StarRatingInput'
import { TextAreaField, TextField } from '@/components/TextField'
import { TEXT_LIMITS } from '@/config/constants'
import { ExtraTypesPicker } from '@/features/spots/components/create/ExtraTypesPicker'
import { SubtypePicker } from '@/features/spots/components/create/SubtypePicker'
import { TypePicker } from '@/features/spots/components/create/TypePicker'
import { SpotTypeBadge } from '@/features/spots/components/SpotTypeBadge'
import { todayIso, type SpotDraft, type SpotDraftErrors } from '@/features/spots/logic/spotDraft'
import { allTypeIds, isSubtypeRequired } from '@/features/spots/logic/spotTypes'
import type { RatingCategory, SpotSubtype, SpotType } from '@/types/models'

interface DetailsStepProps {
  draft: SpotDraft
  /** Adresse affichée : la saisie de l'utilisateur, ou la proposition du service d'adresses. */
  addressValue: string
  /** L'adresse proposée est encore en cours de recherche. */
  addressPending: boolean
  /** La date de visite proposée vient des photos (et non de la date du jour). */
  visitedOnFromPhotos?: boolean
  types: SpotType[]
  /** Sous-catégories de tous les types : seules celles du type choisi sont proposées. */
  subtypes?: SpotSubtype[]
  categories: RatingCategory[]
  /** Erreurs de validation, affichées après une première tentative d'envoi. */
  errors: SpotDraftErrors
  /** Erreur renvoyée par le serveur lors de la création. */
  submitError: string | null
  isSubmitting: boolean
  onChange: (changes: Partial<SpotDraft>) => void
  onSubmit: () => void
  /** Retour à l'écran précédent (flèche en haut à gauche). */
  onBack: () => void
  /** Ouvre la carte de placement. Par défaut : comme la flèche de retour. */
  onEditPosition?: () => void
  /**
   * Modification d'un spot existant : son type, non modifiable. Le choix du
   * type et les notes ne sont alors pas affichés.
   */
  lockedType?: SpotType
  /** Titre de l'écran. */
  title?: string
  /** Libellé du bouton d'envoi. */
  submitLabel?: string
  /** Contenu ajouté sous le bouton d'envoi (suppression du spot, par exemple). */
  footer?: ReactNode
}

/** Seconde étape de la création : type, nom, notes, description, date et adresse. */
export function DetailsStep({
  draft,
  addressValue,
  addressPending,
  visitedOnFromPhotos = false,
  types,
  subtypes = [],
  categories,
  errors,
  submitError,
  isSubmitting,
  onChange,
  onSubmit,
  onBack,
  onEditPosition = onBack,
  lockedType,
  title = 'Nouveau spot',
  submitLabel = 'Créer le spot',
  footer,
}: DetailsStepProps) {
  // Tous les types du spot : le principal, puis les supplémentaires.
  const spotTypeIds = allTypeIds(draft.spotTypeId, draft.extraTypeIds)
  const currentType = lockedType ?? types.find((type) => type.id === draft.spotTypeId)
  const typeLabels = new Map(types.map((type) => [type.id, type.label]))

  // Catégories de notes de tous les types du spot, regroupées par type.
  const typeCategories = spotTypeIds.flatMap((typeId) =>
    categories
      .filter((category) => category.spot_type_id === typeId && category.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((category) => ({ ...category, group: spotTypeIds.length > 1 ? (typeLabels.get(typeId) ?? null) : null })),
  )

  // Sous-catégories proposées par l'un des types du spot.
  const typeSubtypes = spotTypeIds.flatMap((typeId) =>
    subtypes
      .filter((subtype) => subtype.spot_type_id === typeId && subtype.is_active)
      .sort((a, b) => a.sort_order - b.sort_order),
  )

  // Types que l'on peut ajouter : actifs, hors type principal.
  const extraChoices = types
    .filter((type) => type.is_active && type.id !== draft.spotTypeId)
    .sort((a, b) => a.sort_order - b.sort_order)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  function setRating(categoryId: string, value: number | null) {
    const ratings = { ...draft.ratings }
    if (value === null) delete ratings[categoryId]
    else ratings[categoryId] = value
    onChange({ ratings })
  }

  return (
    <div className="flex h-full flex-col bg-paper">
      <header className="safe-top safe-x shrink-0 border-b border-line">
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-2 py-2">
          <button
            type="button"
            onClick={onBack}
            aria-label={lockedType ? 'Annuler les modifications' : 'Revenir au placement sur la carte'}
            className="flex size-12 shrink-0 items-center justify-center rounded-full active:bg-mist"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
      </header>

      <main className="safe-x min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-md space-y-6 px-4 pt-5 pb-8">
          {lockedType ? (
            <div>
              <SpotTypeBadge type={lockedType} />
              <p className="mt-1.5 text-base text-ink-soft">
                Le type d'un spot ne se modifie pas : ses notes en dépendent.
              </p>
            </div>
          ) : (
            <TypePicker
              types={types}
              value={draft.spotTypeId}
              // Changer de type efface les notes et la sous-catégorie : elles dépendent du type.
              onChange={(spotTypeId) =>
                onChange({
                  spotTypeId,
                  // Le nouveau type principal ne peut pas rester parmi les supplémentaires.
                  extraTypeIds: draft.extraTypeIds.filter((id) => id !== spotTypeId),
                  subtypeId: null,
                  ratings: {},
                })
              }
              error={errors.spotTypeId}
            />
          )}

          {draft.spotTypeId && (
            <ExtraTypesPicker
              types={extraChoices}
              value={draft.extraTypeIds}
              onChange={(extraTypeIds) => {
                // Retirer un type efface la sous-catégorie qui lui appartenait.
                const kept = subtypes.find((subtype) => subtype.id === draft.subtypeId)
                const stillValid = kept && allTypeIds(draft.spotTypeId, extraTypeIds).includes(kept.spot_type_id)
                onChange({ extraTypeIds, ...(stillValid ? {} : { subtypeId: null }) })
              }}
            />
          )}

          {typeSubtypes.length > 0 && currentType && (
            <SubtypePicker
              subtypes={typeSubtypes}
              // Couleur du type auquel appartiennent ces sous-catégories (ce peut être un type supplémentaire).
              color={types.find((type) => type.id === typeSubtypes[0]?.spot_type_id)?.color ?? currentType.color}
              value={draft.subtypeId}
              onChange={(subtypeId) => onChange({ subtypeId })}
              // Aucun des types du spot n'impose de sous-catégorie : ce sont des options à cocher.
              optional={!isSubtypeRequired(spotTypeIds, lockedType ? [lockedType, ...types] : types, subtypes)}
              // En modification, la sous-catégorie reste facultative : on peut la retirer.
              clearable={Boolean(lockedType)}
              error={errors.subtypeId}
            />
          )}

          <TextField
            label="Nom"
            name="name"
            value={draft.name}
            onChange={(event) => onChange({ name: event.target.value })}
            error={errors.name}
            maxLength={TEXT_LIMITS.spotName.max}
            autoComplete="off"
            enterKeyHint="next"
          />

          {!lockedType && typeCategories.length > 0 && (
            // "min-w-0" : sans lui, un <fieldset> refuse de rétrécir et déborde de l'écran.
            <fieldset className="min-w-0">
              <legend className="text-base font-medium">Tes notes (facultatif)</legend>
              <div className="mt-1.5 divide-y divide-line rounded-xl border border-line px-3">
                {typeCategories.map((category, index) => (
                  <div key={category.id} className="py-2">
                    {category.group && category.group !== typeCategories[index - 1]?.group && (
                      <p className="pt-1 pb-1.5 text-sm font-semibold tracking-wide text-ink-soft uppercase">{category.group}</p>
                    )}
                    <StarRatingInput
                      label={category.label}
                      value={draft.ratings[category.id] ?? null}
                      onChange={(value) => setRating(category.id, value)}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          <TextAreaField
            label="Description (facultatif)"
            name="description"
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            error={errors.description}
            hint="Accès, particularités, ce qu'il faut savoir avant d'y aller."
            maxLength={TEXT_LIMITS.spotDescription.max}
          />

          <TextField
            label="Date de visite (facultatif)"
            type="date"
            name="visited_on"
            value={draft.visitedOn}
            max={todayIso()}
            onChange={(event) => onChange({ visitedOn: event.target.value, visitedOnEdited: true })}
            error={errors.visitedOn}
            hint={visitedOnFromPhotos && !draft.visitedOnEdited ? 'D\u2019après la date de tes photos.' : undefined}
          />

          <div>
            <TextField
              label="Adresse (facultatif)"
              name="address"
              value={addressValue}
              onChange={(event) => onChange({ address: event.target.value, addressEdited: true })}
              error={errors.address}
              hint={
                addressPending && !draft.addressEdited
                  ? 'Recherche de l\u2019adresse…'
                  : draft.addressEdited
                    ? 'Saisie par toi.'
                    : addressValue
                      ? 'Proposée d\u2019après la position. Tu peux la corriger.'
                      : 'Aucune adresse trouvée pour cette position. Tu peux en saisir une.'
              }
              maxLength={TEXT_LIMITS.spotAddress.max}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onEditPosition}
              className="mt-3 flex min-h-11 items-center gap-2 rounded-lg text-base text-ink-soft underline underline-offset-4"
            >
              <MapPin className="size-5 shrink-0" aria-hidden="true" />
              {draft.lat?.toFixed(5)}, {draft.lng?.toFixed(5)} · Modifier la position
            </button>
          </div>

          {errors.position && <Notice tone="error">{errors.position}</Notice>}
          {submitError && <Notice tone="error">{submitError}</Notice>}

          <Button type="submit" loading={isSubmitting}>
            {submitLabel}
          </Button>
          {footer}
        </form>
      </main>
    </div>
  )
}
