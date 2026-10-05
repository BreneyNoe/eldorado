/**
 * Types de la base de données, au format attendu par supabase-js.
 *
 * Ce fichier est écrit à la main et suit les migrations du dossier
 * supabase/migrations. Il est volontairement plus strict qu'un fichier généré
 * automatiquement : les types "Insert" et "Update" ne contiennent que les
 * colonnes que la base autorise réellement à écrire (migration 4). TypeScript
 * refuse donc, par exemple, de modifier le type ou le créateur d'un spot.
 *
 * À chaque nouvelle migration qui touche une table, une vue ou une fonction,
 * ce fichier doit être mis à jour dans le même commit.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'user' | 'admin'
export type AddressSource = 'auto' | 'manual'

/** Objet { "<id de catégorie>": note de 1 à 5, ou null pour retirer sa note }. */
export type RatingsInput = Record<string, number | null>

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          role: UserRole
          is_active: boolean
          /** Photo de profil : chemin dans le bucket "avatars". */
          avatar_path: string | null
          /** Icône de profil, utilisée quand il n'y a pas de photo. */
          avatar_icon: string | null
          /** Couleur de fond choisie pour l'icône ou l'initiale (#RRGGBB). */
          avatar_color: string | null
          /** Nombre de spots publiés, tenu à jour par la base. Donne le rang (ornement de l'avatar). */
          spot_count: number
          /** Seuil du dernier rang déjà annoncé à l'utilisateur (0 : aucun). */
          rank_seen: number
          created_at: string
          updated_at: string
        }
        // Les profils sont créés par un trigger, jamais par l'application.
        Insert: Record<string, never>
        Update: {
          display_name?: string
          avatar_path?: string | null
          avatar_icon?: string | null
          avatar_color?: string | null
          rank_seen?: number
          role?: UserRole
          is_active?: boolean
        }
        Relationships: []
      }
      spot_types: {
        Row: {
          id: string
          key: string
          label: string
          color: string
          icon: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          color: string
          icon: string
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          key?: string
          label?: string
          color?: string
          icon?: string
          sort_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      spot_extra_types: {
        Row: {
          spot_id: string
          spot_type_id: string
          created_at: string
        }
        Insert: {
          spot_id: string
          spot_type_id: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: 'spot_extra_types_spot_id_fkey'
            columns: ['spot_id']
            isOneToOne: false
            referencedRelation: 'spots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spot_extra_types_spot_type_id_fkey'
            columns: ['spot_type_id']
            isOneToOne: false
            referencedRelation: 'spot_types'
            referencedColumns: ['id']
          },
        ]
      }
      spot_subtypes: {
        Row: {
          id: string
          spot_type_id: string
          key: string
          label: string
          /** Nom d'icône Iconify, de la forme "collection:nom". */
          icon: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          spot_type_id: string
          key: string
          label: string
          icon: string
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          key?: string
          label?: string
          icon?: string
          sort_order?: number
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'spot_subtypes_spot_type_id_fkey'
            columns: ['spot_type_id']
            isOneToOne: false
            referencedRelation: 'spot_types'
            referencedColumns: ['id']
          },
        ]
      }
      rating_categories: {
        Row: {
          id: string
          spot_type_id: string
          key: string
          label: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          spot_type_id: string
          key: string
          label: string
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          key?: string
          label?: string
          sort_order?: number
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'rating_categories_spot_type_id_fkey'
            columns: ['spot_type_id']
            isOneToOne: false
            referencedRelation: 'spot_types'
            referencedColumns: ['id']
          },
        ]
      }
      spots: {
        Row: {
          id: string
          spot_type_id: string
          name: string
          description: string | null
          lat: number
          lng: number
          /** Colonne PostGIS calculée par la base. Ne pas la sélectionner : utiliser lat / lng. */
          location: unknown
          address: string | null
          address_source: AddressSource
          visited_on: string | null
          created_by: string | null
          cover_photo_id: string | null
          /** Sous-catégorie, propre au type du spot. Facultative. */
          subtype_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          spot_type_id: string
          name: string
          description?: string | null
          lat: number
          lng: number
          address?: string | null
          address_source?: AddressSource
          visited_on?: string | null
          subtype_id?: string | null
        }
        Update: {
          name?: string
          description?: string | null
          lat?: number
          lng?: number
          address?: string | null
          address_source?: AddressSource
          visited_on?: string | null
          cover_photo_id?: string | null
          subtype_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'spots_spot_type_id_fkey'
            columns: ['spot_type_id']
            isOneToOne: false
            referencedRelation: 'spot_types'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spots_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spots_cover_photo_fk'
            columns: ['cover_photo_id']
            isOneToOne: false
            referencedRelation: 'spot_photos'
            referencedColumns: ['id']
          },
        ]
      }
      spot_photos: {
        Row: {
          id: string
          spot_id: string
          uploaded_by: string | null
          path_standard: string
          path_thumb: string
          width: number
          height: number
          size_bytes: number
          taken_at: string | null
          created_at: string
        }
        Insert: {
          /** Généré par l'application : il sert à nommer les deux fichiers. */
          id: string
          spot_id: string
          path_standard: string
          path_thumb: string
          width: number
          height: number
          size_bytes: number
          taken_at?: string | null
        }
        // Une photo ne se modifie pas.
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: 'spot_photos_spot_id_fkey'
            columns: ['spot_id']
            isOneToOne: false
            referencedRelation: 'spots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spot_photos_spot_id_fkey'
            columns: ['spot_id']
            isOneToOne: false
            referencedRelation: 'spots_light'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spot_photos_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      spot_ratings: {
        Row: {
          id: string
          spot_id: string
          category_id: string
          user_id: string
          value: number
          created_at: string
          updated_at: string
        }
        // L'écriture des notes passe par la fonction set_spot_ratings.
        Insert: {
          spot_id: string
          category_id: string
          value: number
        }
        Update: {
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: 'spot_ratings_spot_id_fkey'
            columns: ['spot_id']
            isOneToOne: false
            referencedRelation: 'spots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spot_ratings_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'rating_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spot_ratings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      spot_updates: {
        Row: {
          id: string
          spot_id: string
          author_id: string | null
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          spot_id: string
          body: string
        }
        Update: {
          body?: string
        }
        Relationships: [
          {
            foreignKeyName: 'spot_updates_spot_id_fkey'
            columns: ['spot_id']
            isOneToOne: false
            referencedRelation: 'spots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'spot_updates_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'app_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      spots_light: {
        Row: {
          id: string
          spot_type_id: string
          name: string
          lat: number
          lng: number
          address: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          cover_thumb_path: string | null
          subtype_id: string | null
          /** Types supplémentaires du spot, en plus de son type principal. */
          extra_type_ids: string[]
        }
        Relationships: [
          {
            foreignKeyName: 'spots_spot_type_id_fkey'
            columns: ['spot_type_id']
            isOneToOne: false
            referencedRelation: 'spot_types'
            referencedColumns: ['id']
          },
        ]
      }
      spot_rating_summary: {
        Row: {
          spot_id: string
          category_id: string
          /** Moyenne arrondie à une décimale. */
          average: number
          votes: number
        }
        Relationships: [
          {
            foreignKeyName: 'spot_ratings_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'rating_categories'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      nearby_spots: {
        Args: {
          p_lat: number
          p_lng: number
          /** Absent : rayon lu dans app_settings (duplicate_radius_m). */
          p_radius_m?: number
          /** En modification : le spot qu'on déplace, à ignorer. */
          p_exclude_spot_id?: string
        }
        Returns: {
          id: string
          spot_type_id: string
          name: string
          lat: number
          lng: number
          address: string | null
          cover_thumb_path: string | null
          distance_m: number
        }[]
      }
      spots_in_bbox: {
        Args: {
          p_min_lat: number
          p_min_lng: number
          p_max_lat: number
          p_max_lng: number
          p_type_ids?: string[]
          p_limit?: number
        }
        Returns: {
          id: string
          spot_type_id: string
          name: string
          lat: number
          lng: number
          address: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          cover_thumb_path: string | null
          subtype_id: string | null
          /** Types supplémentaires du spot, en plus de son type principal. */
          extra_type_ids: string[]
        }[]
      }
      set_spot_extra_types: {
        Args: { p_spot_id: string; p_type_ids: string[] }
        Returns: undefined
      }
      ping: {
        Args: Record<string, never>
        Returns: boolean
      }
      create_spot: {
        Args: {
          p_spot_type_id: string
          p_name: string
          p_lat: number
          p_lng: number
          p_description?: string
          p_address?: string
          p_address_source?: AddressSource
          p_visited_on?: string
          p_ratings?: RatingsInput
          p_subtype_id?: string
          p_extra_type_ids?: string[]
        }
        /** Id du spot créé. */
        Returns: string
      }
      set_spot_ratings: {
        Args: {
          p_spot_id: string
          p_ratings: RatingsInput
        }
        Returns: undefined
      }
      admin_list_users: {
        Args: Record<string, never>
        Returns: {
          id: string
          email: string
          display_name: string
          role: UserRole
          is_active: boolean
          created_at: string
          last_sign_in_at: string | null
        }[]
      }
      admin_storage_report: {
        Args: Record<string, never>
        Returns: {
          file_count: number
          file_bytes: number
          photo_count: number
          photo_bytes: number
        }[]
      }
      admin_orphan_files: {
        Args: {
          p_min_age_minutes?: number
        }
        Returns: {
          name: string
          size_bytes: number
          created_at: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
