/**
 * Lecture et création des spots, de leurs types et de leurs catégories de notation.
 * Toutes les fonctions lèvent une AppError en cas d'échec.
 */
import { toAppError } from '@/lib/errors'
import { fetchAllPages } from '@/lib/pagination'
import { supabase } from '@/lib/supabase'
import type {
  AddressSource,
  NearbySpot,
  RatingCategory,
  RatingsInput,
  SpotLight,
  SpotSubtype,
  SpotType,
} from '@/types/models'

/** Tous les types de spots, actifs ou non, dans leur ordre d'affichage. */
export async function fetchSpotTypes(): Promise<SpotType[]> {
  const { data, error } = await supabase.from('spot_types').select('*').order('sort_order')
  if (error) throw toAppError(error)
  return data
}

/**
 * Version légère de tous les spots : ce qu'affichent la carte et la liste.
 * Le tri par id rend la pagination stable (aucun spot sauté ni doublé).
 */
export async function fetchSpotsLight(): Promise<SpotLight[]> {
  return fetchAllPages(async (from, to) => {
    const { data, error } = await supabase.from('spots_light').select('*').order('id').range(from, to)
    if (error) throw toAppError(error)
    return data
  })
}

/** Toutes les sous-catégories, tous types confondus, dans leur ordre d'affichage. */
export async function fetchSpotSubtypes(): Promise<SpotSubtype[]> {
  const { data, error } = await supabase.from('spot_subtypes').select('*').order('sort_order')
  if (error) throw toAppError(error)
  return data
}

/** Toutes les catégories de notation, tous types confondus, dans leur ordre d'affichage. */
export async function fetchRatingCategories(): Promise<RatingCategory[]> {
  const { data, error } = await supabase.from('rating_categories').select('*').order('sort_order')
  if (error) throw toAppError(error)
  return data
}

/**
 * Spots existants autour d'un point, du plus proche au plus lointain.
 * Le rayon est celui réglé par l'administrateur (paramètre duplicate_radius_m).
 */
export async function fetchNearbySpots(lat: number, lng: number, excludeSpotId?: string): Promise<NearbySpot[]> {
  const { data, error } = await supabase.rpc('nearby_spots', {
    p_lat: lat,
    p_lng: lng,
    // En modification : le spot qu'on déplace ne doit pas se signaler lui-même.
    ...(excludeSpotId ? { p_exclude_spot_id: excludeSpotId } : {}),
  })
  if (error) throw toAppError(error)
  return data
}

export interface CreateSpotInput {
  spotTypeId: string
  /** Sous-catégorie du type, s'il en propose. */
  subtypeId: string | null
  name: string
  lat: number
  lng: number
  description: string | null
  address: string | null
  addressSource: AddressSource
  /** Date au format AAAA-MM-JJ. */
  visitedOn: string | null
  /** { id de catégorie : note de 1 à 5 }. */
  ratings: RatingsInput
}

/**
 * Crée le spot et les notes de son auteur en une seule opération : si une
 * note est refusée, rien n'est créé. Renvoie l'id du nouveau spot.
 */
export async function createSpot(input: CreateSpotInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_spot', {
    p_spot_type_id: input.spotTypeId,
    p_name: input.name,
    p_lat: input.lat,
    p_lng: input.lng,
    p_description: input.description ?? undefined,
    p_address: input.address ?? undefined,
    p_address_source: input.addressSource,
    p_visited_on: input.visitedOn ?? undefined,
    p_ratings: input.ratings,
    ...(input.subtypeId ? { p_subtype_id: input.subtypeId } : {}),
  })
  if (error) throw toAppError(error)
  return data
}
