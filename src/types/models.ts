/**
 * Noms courts pour les types de la base, à utiliser partout dans l'application.
 *
 *   import type { Spot, SpotLight } from '@/types/models'
 */
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type Views = Database['public']['Views']
type Functions = Database['public']['Functions']

export type Profile = Tables['profiles']['Row']
export type SpotType = Tables['spot_types']['Row']
export type RatingCategory = Tables['rating_categories']['Row']
/** Sous-catégorie d'un type de spot (par exemple « Rails » pour le type Ride). */
export type SpotSubtype = Tables['spot_subtypes']['Row']
/** Un spot complet, sans la colonne PostGIS interne. */
export type Spot = Omit<Tables['spots']['Row'], 'location'>
export type SpotPhoto = Tables['spot_photos']['Row']
export type SpotRating = Tables['spot_ratings']['Row']
export type SpotUpdate = Tables['spot_updates']['Row']
export type AppSetting = Tables['app_settings']['Row']

/** Version légère d'un spot : ce que chargent la carte et la liste. */
export type SpotLight = Views['spots_light']['Row']
/** Moyenne et nombre de votes d'une catégorie pour un spot. */
export type RatingSummary = Views['spot_rating_summary']['Row']

export type NearbySpot = Functions['nearby_spots']['Returns'][number]
export type AdminUser = Functions['admin_list_users']['Returns'][number]
export type StorageReport = Functions['admin_storage_report']['Returns'][number]
export type OrphanFile = Functions['admin_orphan_files']['Returns'][number]

export type SpotInsert = Tables['spots']['Insert']
export type SpotChanges = Tables['spots']['Update']
export type SpotPhotoInsert = Tables['spot_photos']['Insert']

/** Colonnes à demander quand on lit un spot complet (jamais "*", qui inclurait "location"). */
export const SPOT_COLUMNS =
  'id, spot_type_id, name, description, lat, lng, address, address_source, visited_on, created_by, cover_photo_id, subtype_id, created_at, updated_at' as const

export type { AddressSource, RatingsInput, UserRole } from '@/types/database'
