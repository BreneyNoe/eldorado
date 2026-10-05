/**
 * Demande à la fonction serveur "resolve-map-link" où mène un lien court de
 * Google Maps. Lève une AppError dont le message explique quoi faire.
 */
import { isValidCoordinate } from '@/features/map/logic/mapView'
import type { LatLng } from '@/features/spots/logic/geo'
import { AppError, toAppError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

const FALLBACK_HELP =
  'Dans Google Maps, appuie longuement sur le lieu pour poser un repère, touche les coordonnées pour les copier, puis colle-les ici.'

/** Réponse d'erreur de la fonction serveur, quand elle en donne une. */
interface FunctionFailure {
  error?: string
  code?: string
  message?: string
  detail?: string
}

async function readFailure(error: unknown): Promise<{ status: number | undefined; body: FunctionFailure }> {
  const response = (error as { context?: Response }).context
  let body: FunctionFailure = {}
  try {
    body = (await response?.clone().json()) as FunctionFailure
  } catch {
    // Réponse vide ou illisible : on se contente du code HTTP.
  }
  return { status: response?.status, body }
}

/**
 * Message expliquant pourquoi un lien n'a pas pu être lu, et quoi faire.
 * Le détail technique en fin de message sert au diagnostic. Fonction pure.
 */
export function mapLinkFailureMessage(status: number | undefined, body: FunctionFailure): { code: string; message: string } {
  const detail = ` (détail : ${[status ?? 'aucune réponse', body.error ?? body.code, body.detail].filter(Boolean).join(', ')})`

  if (body.error === 'unreachable') {
    return {
      code: 'APP_MAP_LINK_UNREACHABLE',
      message: `La lecture des liens Google Maps n'a pas répondu. Le plus souvent, c'est que la fonction « resolve-map-link » n'est pas installée dans Supabase, ou que son option « Verify JWT » est restée activée (voir docs/google-maps.md). ${FALLBACK_HELP}${detail}`,
    }
  }
  if (status === 404 && body.error !== 'position_not_found') {
    return {
      code: 'APP_MAP_LINK_NOT_INSTALLED',
      message: `La lecture des liens Google Maps n'est pas installée sur le serveur (fonction « resolve-map-link » absente, voir docs/google-maps.md). ${FALLBACK_HELP}${detail}`,
    }
  }
  if (status === 401 || status === 403) {
    return {
      code: 'APP_MAP_LINK_UNAUTHORIZED',
      message: `Le serveur a refusé de lire ce lien. Dans Supabase, ouvre la fonction « resolve-map-link » et désactive l'option « Verify JWT ». ${FALLBACK_HELP}${detail}`,
    }
  }
  if (body.error === 'position_not_found') {
    return {
      code: 'APP_MAP_LINK_NO_POSITION',
      message: `Google ne donne pas de position exploitable pour ce lien. ${FALLBACK_HELP}${detail}`,
    }
  }
  return { code: 'APP_MAP_LINK_FAILED', message: `Ce lien n'a pas pu être lu. ${FALLBACK_HELP}${detail}` }
}

/** Position tirée d'un lien. `approximate` : elle est proche du lieu, mais le repère reste à ajuster. */
export interface ResolvedPosition extends LatLng {
  approximate?: boolean
}

export async function resolveMapLink(url: string): Promise<ResolvedPosition> {
  const { data, error } = await supabase.functions.invoke<{ lat?: number; lng?: number; approximate?: boolean }>('resolve-map-link', {
    body: { url },
  })

  if (error) {
    if (error.name === 'FunctionsFetchError') {
      // L'appel n'a reçu aucune réponse lisible. Sans réseau, c'est une panne de
      // connexion ordinaire. Avec du réseau, c'est presque toujours que la
      // fonction n'existe pas : Supabase répond alors d'une façon que le
      // navigateur refuse de transmettre à l'application.
      if (typeof navigator !== 'undefined' && !navigator.onLine) throw toAppError({ message: 'Failed to fetch' })
      const failure = mapLinkFailureMessage(undefined, { error: 'unreachable' })
      throw new AppError('unknown', failure.message, { code: failure.code, cause: error })
    }
    const { status, body } = await readFailure(error)
    const failure = mapLinkFailureMessage(status, body)
    throw new AppError(status === 404 ? 'not_found' : 'unknown', failure.message, { code: failure.code, cause: error })
  }

  if (!data || !isValidCoordinate(data.lat, data.lng)) {
    const failure = mapLinkFailureMessage(200, { error: 'position_not_found' })
    throw new AppError('not_found', failure.message, { code: failure.code })
  }
  return { lat: data.lat as number, lng: data.lng as number, ...(data.approximate ? { approximate: true } : {}) }
}
