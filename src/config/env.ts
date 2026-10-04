/**
 * Lecture et validation des variables d'environnement.
 *
 * C'est le SEUL fichier qui lit import.meta.env. Le reste de l'application
 * passe par getEnv(), ce qui garantit qu'une configuration incomplète est
 * détectée au démarrage avec un message clair, et non par un écran blanc.
 */

export interface AppEnv {
  supabaseUrl: string
  supabasePublishableKey: string
  mapStyleUrl: string
  /** Modèle d'adresse des images de la vue satellite, avec {z}, {x} et {y}. */
  satelliteTilesUrl: string
  geocoderUrl: string
  basePath: string
}

export type EnvResult = { ok: true; env: AppEnv } | { ok: false; problems: string[] }

type RawEnv = Record<string, unknown>

const DEFAULT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
// Photos aériennes de l'IGN (Géoplateforme) : gratuites, sans clé, France uniquement.
const DEFAULT_SATELLITE_TILES_URL =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
const DEFAULT_GEOCODER_URL = 'https://nominatim.openstreetmap.org'

function readString(raw: RawEnv, name: string): string {
  const value = raw[name]
  return typeof value === 'string' ? value.trim() : ''
}

function isHttpUrl(value: string, allowHttp: boolean): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || (allowHttp && url.protocol === 'http:')
  } catch {
    return false
  }
}

function isLocalUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * Détecte une ancienne clé "service_role" (format JWT), qui donne tous les
 * droits sur la base et ne doit jamais se trouver dans le frontend.
 */
function isLegacyServiceRoleKey(key: string): boolean {
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload: unknown = JSON.parse(atob(base64))
    return (
      typeof payload === 'object' &&
      payload !== null &&
      (payload as { role?: unknown }).role === 'service_role'
    )
  } catch {
    return false
  }
}

/** Fonction pure : facile à tester, ne lit rien de global. */
export function parseEnv(raw: RawEnv): EnvResult {
  const problems: string[] = []

  let supabaseUrl = readString(raw, 'VITE_SUPABASE_URL')
  if (!supabaseUrl) {
    problems.push('VITE_SUPABASE_URL est absente.')
  } else if (supabaseUrl.includes('xxxxxxxx')) {
    problems.push("VITE_SUPABASE_URL contient encore la valeur d'exemple.")
  } else if (!isHttpUrl(supabaseUrl, isLocalUrl(supabaseUrl))) {
    problems.push('VITE_SUPABASE_URL doit être une adresse commençant par https://')
  } else {
    // On ne garde que "https://<projet>.supabase.co". Le tableau de bord
    // Supabase affiche parfois l'adresse suivie de "/rest/v1/" : la bibliothèque
    // ajoute elle-même ce chemin, et le laisser provoque une erreur PGRST125.
    supabaseUrl = new URL(supabaseUrl).origin
  }

  const supabasePublishableKey = readString(raw, 'VITE_SUPABASE_PUBLISHABLE_KEY')
  if (!supabasePublishableKey) {
    problems.push('VITE_SUPABASE_PUBLISHABLE_KEY est absente.')
  } else if (supabasePublishableKey.includes('xxxxxxxx')) {
    problems.push("VITE_SUPABASE_PUBLISHABLE_KEY contient encore la valeur d'exemple.")
  } else if (
    supabasePublishableKey.startsWith('sb_secret_') ||
    isLegacyServiceRoleKey(supabasePublishableKey)
  ) {
    problems.push(
      'VITE_SUPABASE_PUBLISHABLE_KEY contient une clé SECRÈTE. Retire-la tout de suite, ' +
        'régénère-la dans Supabase, et utilise la clé "publishable" (sb_publishable_...).',
    )
  }

  const mapStyleUrl = readString(raw, 'VITE_MAP_STYLE_URL') || DEFAULT_MAP_STYLE_URL
  if (!isHttpUrl(mapStyleUrl, isLocalUrl(mapStyleUrl))) {
    problems.push('VITE_MAP_STYLE_URL doit être une adresse commençant par https://')
  }

  const satelliteTilesUrl = readString(raw, 'VITE_SATELLITE_TILES_URL') || DEFAULT_SATELLITE_TILES_URL
  // Les accolades de {z}, {x}, {y} sont retirées le temps de vérifier que le reste est une adresse valide.
  const satelliteProbe = satelliteTilesUrl.replace(/[{}]/g, '')
  if (!isHttpUrl(satelliteProbe, isLocalUrl(satelliteProbe)) || !/\{z\}/.test(satelliteTilesUrl) || !/\{x\}/.test(satelliteTilesUrl) || !/\{y\}/.test(satelliteTilesUrl)) {
    problems.push('VITE_SATELLITE_TILES_URL doit être une adresse https contenant {z}, {x} et {y}.')
  }

  const geocoderUrl = (readString(raw, 'VITE_GEOCODER_URL') || DEFAULT_GEOCODER_URL).replace(
    /\/+$/,
    '',
  )
  if (!isHttpUrl(geocoderUrl, isLocalUrl(geocoderUrl))) {
    problems.push('VITE_GEOCODER_URL doit être une adresse commençant par https://')
  }

  // Fourni par Vite à partir de l'option "base" (elle-même issue de VITE_BASE_PATH).
  const basePath = readString(raw, 'BASE_URL') || '/'

  if (problems.length > 0) return { ok: false, problems }

  return {
    ok: true,
    env: { supabaseUrl, supabasePublishableKey, mapStyleUrl, satelliteTilesUrl, geocoderUrl, basePath },
  }
}

let cached: EnvResult | null = null

/** Résultat de la validation, sans lever d'erreur. Utilisé au démarrage. */
export function readEnv(): EnvResult {
  cached ??= parseEnv(import.meta.env)
  return cached
}

/** Configuration validée. Lève une erreur si elle est invalide. */
export function getEnv(): AppEnv {
  const result = readEnv()
  if (!result.ok) {
    throw new Error(`Configuration invalide : ${result.problems.join(' ')}`)
  }
  return result.env
}
