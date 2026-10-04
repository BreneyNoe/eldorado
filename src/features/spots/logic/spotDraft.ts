/**
 * Brouillon d'un spot en cours de création : validation et préparation de
 * l'envoi. Fonctions pures.
 */
import { RATING_SCALE, TEXT_LIMITS } from '@/config/constants'
import { isValidCoordinate } from '@/features/map/logic/mapView'
import type { AddressSource, RatingsInput } from '@/types/models'

export interface SpotDraft {
  lat: number | null
  lng: number | null
  spotTypeId: string | null
  /** Sous-catégorie choisie, quand le type en propose. */
  subtypeId: string | null
  name: string
  description: string
  /** Adresse saisie par l'utilisateur. Ignorée tant que addressEdited est faux. */
  address: string
  /** Faux : on affiche l'adresse proposée par le service d'adresses. Vrai : l'utilisateur a pris la main. */
  addressEdited: boolean
  /** Date au format AAAA-MM-JJ, ou vide. */
  visitedOn: string
  /** Vrai dès que l'utilisateur a choisi la date lui-même : elle n'est alors plus remplacée par celle des photos. */
  visitedOnEdited: boolean
  /** { id de catégorie : note de 1 à 5 }. Une catégorie absente n'est pas notée. */
  ratings: Record<string, number>
}

export type SpotDraftErrors = Partial<Record<'position' | 'spotTypeId' | 'subtypeId' | 'name' | 'description' | 'address' | 'visitedOn', string>>

/** Date du jour au format AAAA-MM-JJ, dans le fuseau de l'appareil. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function emptyDraft(now: Date = new Date()): SpotDraft {
  return {
    lat: null,
    lng: null,
    spotTypeId: null,
    subtypeId: null,
    name: '',
    description: '',
    address: '',
    addressEdited: false,
    visitedOn: todayIso(now),
    visitedOnEdited: false,
    ratings: {},
  }
}

/**
 * @param options.subtypeRequired  le type choisi propose des sous-catégories : il faut en choisir une
 */
export function validateSpotDraft(
  draft: SpotDraft,
  now: Date = new Date(),
  options: { subtypeRequired?: boolean } = {},
): SpotDraftErrors {
  const errors: SpotDraftErrors = {}
  if (options.subtypeRequired && !draft.subtypeId) errors.subtypeId = 'Choisis une sous-catégorie.'

  if (draft.lat === null || draft.lng === null || !isValidCoordinate(draft.lat, draft.lng)) {
    errors.position = 'Place le spot sur la carte.'
  }
  if (!draft.spotTypeId) errors.spotTypeId = 'Choisis un type de spot.'

  const nameLength = draft.name.trim().length
  if (nameLength < TEXT_LIMITS.spotName.min) {
    errors.name = `Le nom doit contenir au moins ${TEXT_LIMITS.spotName.min} caractères.`
  } else if (nameLength > TEXT_LIMITS.spotName.max) {
    errors.name = `Le nom ne peut pas dépasser ${TEXT_LIMITS.spotName.max} caractères.`
  }

  if (draft.description.length > TEXT_LIMITS.spotDescription.max) {
    errors.description = `La description ne peut pas dépasser ${TEXT_LIMITS.spotDescription.max} caractères.`
  }
  if (draft.address.trim().length > TEXT_LIMITS.spotAddress.max) {
    errors.address = `L'adresse ne peut pas dépasser ${TEXT_LIMITS.spotAddress.max} caractères.`
  }

  if (draft.visitedOn) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.visitedOn)) errors.visitedOn = 'Cette date est invalide.'
    else if (draft.visitedOn > todayIso(now)) errors.visitedOn = 'La date de visite ne peut pas être dans le futur.'
  }

  return errors
}

/** Vrai pour une note acceptée par la base : de 0,5 à 5, par demi-étoile. */
export function isValidRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    value >= RATING_SCALE.min &&
    value <= RATING_SCALE.max &&
    Number.isInteger(value / RATING_SCALE.step)
  )
}

/** Notes prêtes pour la base : uniquement des valeurs de 0,5 à 5, par demi-étoile. */
export function cleanRatings(ratings: Record<string, number>): RatingsInput {
  const clean: RatingsInput = {}
  for (const [categoryId, value] of Object.entries(ratings)) {
    if (isValidRating(value)) {
      clean[categoryId] = value
    }
  }
  return clean
}

/**
 * "auto" si l'adresse est celle proposée par le service, "manual" si
 * l'utilisateur l'a saisie ou corrigée. Une adresse manuelle ne sera pas
 * écrasée si le spot est déplacé plus tard.
 */
export function addressSourceOf(address: string, suggestedAddress: string | null): AddressSource {
  const clean = address.trim()
  if (!clean) return 'auto'
  return clean === (suggestedAddress ?? '').trim() ? 'auto' : 'manual'
}

/** Adresse à afficher dans le formulaire : celle de l'utilisateur s'il l'a modifiée, sinon la proposition. */
export function effectiveAddress(draft: Pick<SpotDraft, 'address' | 'addressEdited'>, suggestedAddress: string | null): string {
  return draft.addressEdited ? draft.address : (suggestedAddress ?? '')
}

/** 6 décimales : précision d'environ 10 cm, largement suffisante. */
export function roundCoordinate(value: number): number {
  return Number(value.toFixed(6))
}
