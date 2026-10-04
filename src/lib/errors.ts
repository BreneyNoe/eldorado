/**
 * Modèle d'erreur unique de l'application.
 *
 * Toute erreur (réseau, Supabase, base de données) est convertie en AppError
 * par toAppError(). L'interface n'affiche jamais un message technique brut :
 * elle affiche error.message, déjà en français, et peut proposer "Réessayer"
 * quand error.retryable est vrai.
 */

export type AppErrorKind =
  | 'network' // pas de connexion, serveur injoignable
  | 'auth' // non connecté, session expirée, mauvais identifiants
  | 'permission' // connecté mais action refusée par la base
  | 'not_found'
  | 'validation' // donnée refusée par une contrainte
  | 'conflict' // doublon
  | 'rate_limit' // trop de tentatives en peu de temps
  | 'unknown'

export class AppError extends Error {
  readonly kind: AppErrorKind
  /** Code technique d'origine (APP_..., code Postgres...), utile pour le débogage. */
  readonly code: string | null
  /** Vrai si réessayer a une chance de fonctionner. */
  readonly retryable: boolean

  constructor(
    kind: AppErrorKind,
    message: string,
    options?: { code?: string | null; cause?: unknown },
  ) {
    // "cause" conserve l'erreur d'origine, visible dans la console du navigateur.
    super(message, { cause: options?.cause })
    this.name = 'AppError'
    this.kind = kind
    this.code = options?.code ?? null
    this.retryable = kind === 'network' || kind === 'unknown'
  }
}

/** Erreurs métier levées par nos fonctions et triggers SQL (voir supabase/README.md). */
const DATABASE_APP_ERRORS: Record<string, { kind: AppErrorKind; message: string }> = {
  APP_FORBIDDEN_PROFILE_FIELDS: {
    kind: 'permission',
    message: "Seul un administrateur peut modifier le rôle ou l'état d'un compte.",
  },
  APP_LAST_ADMIN: {
    kind: 'validation',
    message: 'Il doit rester au moins un administrateur actif.',
  },
  APP_SPOT_TYPE_INACTIVE: {
    kind: 'validation',
    message: "Ce type de spot n'est plus disponible.",
  },
  APP_COVER_NOT_IN_SPOT: {
    kind: 'validation',
    message: "Cette photo n'appartient pas à ce spot.",
  },
  APP_RATING_CATEGORY_MISMATCH: {
    kind: 'validation',
    message: 'Cette catégorie de note ne correspond pas au type du spot.',
  },
  APP_RATING_CATEGORY_INACTIVE: {
    kind: 'validation',
    message: "Cette catégorie de note n'est plus disponible.",
  },
  APP_PHOTO_LIMIT: {
    kind: 'validation',
    message: 'Ce spot a déjà le nombre maximal de photos.',
  },
  APP_SUBTYPE_MISMATCH: {
    kind: 'validation',
    message: 'Cette sous-catégorie ne correspond pas au type du spot.',
  },
  APP_INVALID_RATINGS: {
    kind: 'validation',
    message: 'Les notes doivent être comprises entre 1 et 5.',
  },
  APP_ADMIN_ONLY: {
    kind: 'permission',
    message: 'Cette action est réservée aux administrateurs.',
  },
}

/** Contraintes de la base (migration 1) traduites en messages lisibles. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  profiles_display_name_length: 'Le nom affiché doit contenir entre 2 et 40 caractères.',
  spots_name_length: 'Le nom du spot doit contenir entre 2 et 80 caractères.',
  spots_description_length: 'La description ne peut pas dépasser 2 000 caractères.',
  spots_address_length: "L'adresse ne peut pas dépasser 300 caractères.",
  spots_lat_range: 'La position du spot est invalide.',
  spots_lng_range: 'La position du spot est invalide.',
  spot_updates_body_length: "L'update doit contenir entre 1 et 1 000 caractères.",
  spot_ratings_value_range: 'Les notes doivent être comprises entre 1 et 5.',
  spot_photos_size_range: 'Cette photo est trop lourde.',
  spot_types_key_unique: 'Un type utilise déjà cet identifiant.',
  rating_categories_type_key_unique: 'Une catégorie utilise déjà cet identifiant pour ce type.',
}

const MESSAGES = {
  network: 'Connexion impossible. Vérifie ton réseau puis réessaie.',
  auth: 'Ta session a expiré. Reconnecte-toi.',
  invalidCredentials: 'Email ou mot de passe incorrect.',
  permission: "Tu n'as pas le droit de faire cette action.",
  notFound: 'Cet élément est introuvable. Il a peut-être été supprimé.',
  validation: "Certaines informations ne sont pas valides.",
  conflict: 'Cet élément existe déjà.',
  inUse: 'Impossible de supprimer cet élément : il est encore utilisé.',
  tooLarge: 'Ce fichier est trop lourd.',
  badFileType: "Ce type de fichier n'est pas accepté.",
  unknown: "Une erreur inattendue s'est produite. Réessaie.",
  accountBlocked: 'Ce compte est bloqué. Contacte un administrateur.',
  emailNotConfirmed: "Ce compte n'est pas encore activé. Contacte un administrateur.",
  weakPassword: 'Ce mot de passe est trop faible. Choisis-en un plus long.',
  emailTaken: 'Un compte existe déjà avec cet email. Connecte-toi, ou demande à un administrateur de remettre ton mot de passe.',
  signUpClosed: 'Les inscriptions sont fermées. Demande à un administrateur du groupe de les ouvrir.',
  samePassword: "Le nouveau mot de passe doit être différent de l'ancien.",
  rateLimit: 'Trop de tentatives. Patiente une minute puis réessaie.',
} as const

/** Codes de Supabase Auth qui signifient tous : la session n'est plus valable. */
const EXPIRED_SESSION_CODES = new Set([
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'no_authorization',
  'user_not_found',
  'reauthentication_needed',
])

interface ErrorLike {
  message?: unknown
  code?: unknown
  status?: unknown
  statusCode?: unknown
  name?: unknown
  details?: unknown
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function looksLikeNetworkFailure(text: string): boolean {
  // Chrome : "Failed to fetch" ; Safari : "Load failed" ; Firefox : "NetworkError".
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(text)
}

function extractConstraintName(text: string): string | null {
  const match = /constraint "([a-z0-9_]+)"/i.exec(text)
  return match ? match[1] : null
}

/** Convertit n'importe quelle erreur en AppError. Ne lève jamais. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new AppError('network', MESSAGES.network, { cause: error })
  }

  const source: ErrorLike =
    typeof error === 'object' && error !== null ? (error as ErrorLike) : { message: error }
  const message = asText(source.message)
  const code = asText(source.code)
  const status = Number(asText(source.status) || asText(source.statusCode)) || 0
  const details = asText(source.details)
  const name = asText(source.name)
  const options = { code: code || null, cause: error }

  // 1. Erreurs métier de nos fonctions SQL : le message EST le code.
  const appCode = /APP_[A-Z_]+/.exec(message)?.[0]
  if (appCode && DATABASE_APP_ERRORS[appCode]) {
    const known = DATABASE_APP_ERRORS[appCode]
    return new AppError(known.kind, known.message, { code: appCode, cause: error })
  }

  // 2. Réseau. "AuthRetryableFetchError" est le nom que Supabase Auth donne à
  //    une requête de connexion restée sans réponse.
  if (
    name === 'AuthRetryableFetchError' ||
    looksLikeNetworkFailure(message) ||
    looksLikeNetworkFailure(details)
  ) {
    return new AppError('network', MESSAGES.network, options)
  }

  // 3. Authentification Supabase.
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return new AppError('auth', MESSAGES.invalidCredentials, options)
  }
  if (code === 'user_banned') {
    return new AppError('permission', MESSAGES.accountBlocked, options)
  }
  if (code === 'email_not_confirmed') {
    return new AppError('auth', MESSAGES.emailNotConfirmed, options)
  }
  if (code === 'weak_password') {
    return new AppError('validation', MESSAGES.weakPassword, options)
  }
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(message)) {
    return new AppError('conflict', MESSAGES.emailTaken, options)
  }
  if (code === 'signup_disabled' || /signups not allowed/i.test(message)) {
    return new AppError('permission', MESSAGES.signUpClosed, options)
  }
  if (code === 'same_password') {
    return new AppError('validation', MESSAGES.samePassword, options)
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return new AppError('rate_limit', MESSAGES.rateLimit, options)
  }
  if (
    EXPIRED_SESSION_CODES.has(code) ||
    name === 'AuthSessionMissingError' ||
    code === 'PGRST301' ||
    code === 'PGRST303' ||
    /jwt expired|session.*(missing|expired)/i.test(message)
  ) {
    return new AppError('auth', MESSAGES.auth, options)
  }

  // 4. Contraintes et droits de la base (codes PostgreSQL).
  if (code === '23514' || code === '23502') {
    const constraint = extractConstraintName(message)
    const specific = constraint ? CONSTRAINT_MESSAGES[constraint] : undefined
    return new AppError('validation', specific ?? MESSAGES.validation, options)
  }
  if (code === '23505') {
    const constraint = extractConstraintName(message)
    const specific = constraint ? CONSTRAINT_MESSAGES[constraint] : undefined
    return new AppError('conflict', specific ?? MESSAGES.conflict, options)
  }
  if (code === '23503') {
    return new AppError('validation', MESSAGES.inUse, options)
  }
  if (code === '42501' || /row-level security/i.test(message)) {
    return new AppError('permission', MESSAGES.permission, options)
  }
  if (code === 'PGRST116') {
    return new AppError('not_found', MESSAGES.notFound, options)
  }
  if (code === '22023' || code === '22P02') {
    return new AppError('validation', MESSAGES.validation, options)
  }

  // 5. Stockage et statuts HTTP génériques.
  if (status === 413 || /payload too large|exceeded the maximum allowed size/i.test(message)) {
    return new AppError('validation', MESSAGES.tooLarge, options)
  }
  if (status === 415 || /mime type .* is not supported/i.test(message)) {
    return new AppError('validation', MESSAGES.badFileType, options)
  }
  if (status === 401) return new AppError('auth', MESSAGES.auth, options)
  if (status === 403) return new AppError('permission', MESSAGES.permission, options)
  if (status === 404) return new AppError('not_found', MESSAGES.notFound, options)
  if (status === 409) return new AppError('conflict', MESSAGES.conflict, options)

  return new AppError('unknown', MESSAGES.unknown, options)
}

/**
 * Raccourci pour la couche api/ : renvoie la donnée ou lève une AppError.
 *
 *   const spots = unwrap(await supabase.from('spots_light').select('*'))
 */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toAppError(result.error)
  if (result.data === null) {
    throw new AppError('not_found', MESSAGES.notFound)
  }
  return result.data
}
