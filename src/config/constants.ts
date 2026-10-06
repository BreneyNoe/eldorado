/**
 * Réglages métier de l'application, au même endroit.
 * Les limites de texte reprennent exactement les contraintes de la base :
 * si tu en changes une ici, change-la aussi par une migration SQL.
 */

/** Nom affiché de l'application. À personnaliser. */
export const APP_NAME = 'Eldorado'

/** Bucket Supabase Storage qui contient les photos (migration 5). */
export const STORAGE_BUCKET = 'spot-photos'

export const IMAGE_SETTINGS = {
  /** Plus grand côté de l'image standard, en pixels. */
  // 1 280 px : net en plein écran sur un téléphone, et nettement plus léger que 1 600 px.
  standardMaxEdge: 1280,
  standardQuality: 0.7,
  /** Plus grand côté de la miniature, en pixels. */
  thumbMaxEdge: 400,
  thumbQuality: 0.65,
  /** Limite imposée par le bucket : 2 Mo par fichier. */
  maxUploadBytes: 2 * 1024 * 1024,
  /**
   * Nombre maximal de photos par spot, utilisé tant que le réglage de la base
   * (max_photos_per_spot, modifiable dans l'administration) n'a pas été lu.
   */
  fallbackMaxPhotosPerSpot: 10,
} as const

export const GEO_SETTINGS = {
  /** Rayon de détection des doublons si le paramètre en base est illisible. */
  fallbackDuplicateRadiusM: 100,
  /** En dessous de cette distance, des photos sont considérées du même lieu. */
  photoGroupingRadiusM: 150,
} as const

export const TEXT_LIMITS = {
  displayName: { min: 2, max: 40 },
  spotName: { min: 2, max: 80 },
  spotDescription: { max: 2000 },
  spotAddress: { max: 300 },
  updateBody: { min: 1, max: 1000 },
} as const

/** Notes de 0,5 à 5 étoiles, par demi-étoile. */
export const RATING_SCALE = { min: 0.5, max: 5, step: 0.5 } as const

/** Longueur minimale exigée par l'application pour un nouveau mot de passe. */
export const PASSWORD_MIN_LENGTH = 8

/** Photos de profil : leur propre bucket, des carrés de 256 px. */
export const AVATAR_SETTINGS = {
  bucket: 'avatars',
  size: 256,
  quality: 0.85,
} as const

/** Mention légale affichée sur la vue satellite (photos aériennes de l'IGN). */
export const SATELLITE_ATTRIBUTION = '© IGN'
