/**
 * Lecture d'une position dans un texte collé : coordonnées copiées depuis
 * Google Maps, ou lien de carte. Fonctions pures.
 *
 * Trois issues possibles :
 *   - des coordonnées ont été trouvées ;
 *   - c'est un lien court (maps.app.goo.gl) : il ne contient pas la
 *     position, il faut demander à un serveur où il mène ;
 *   - rien d'exploitable.
 */
import { isValidCoordinate } from '@/features/map/logic/mapView'
import type { LatLng } from '@/features/spots/logic/geo'

export type ParsedLocation =
  | { kind: 'coordinates'; position: LatLng }
  | { kind: 'short_link'; url: string }
  | { kind: 'unknown' }

const NUMBER = String.raw`-?\d{1,3}(?:\.\d+)?`

function toPosition(lat: number, lng: number): LatLng | null {
  // (0, 0) n'est jamais une vraie position de spot : c'est une valeur par défaut.
  if (!isValidCoordinate(lat, lng) || (lat === 0 && lng === 0)) return null
  return { lat, lng }
}

function fromPair(text: string | null | undefined): LatLng | null {
  if (!text) return null
  const match = new RegExp(`^\\s*(${NUMBER})\\s*[,; ]\\s*(${NUMBER})\\s*$`).exec(text)
  return match ? toPosition(Number(match[1]), Number(match[2])) : null
}

/** Degrés, minutes, secondes : 44°48'03.2"N 4°15'10.8"E */
function fromDms(text: string): LatLng | null {
  const part = String.raw`(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:[.,]\d+)?)\s*(?:"|″|'')\s*([NSEWO])`
  const match = new RegExp(`${part}[\\s,+]*${part}`, 'i').exec(text)
  if (!match) return null

  const toDecimal = (degrees: string, minutes: string, seconds: string, hemisphere: string) => {
    const value = Number(degrees) + Number(minutes) / 60 + Number(seconds.replace(',', '.')) / 3600
    // "O" : ouest, en français.
    return /[SWO]/i.test(hemisphere) ? -value : value
  }
  const first = toDecimal(match[1], match[2], match[3], match[4])
  const second = toDecimal(match[5], match[6], match[7], match[8])
  // L'ordre habituel est latitude puis longitude ; on tolère l'inverse.
  return /[NS]/i.test(match[4]) ? toPosition(first, second) : toPosition(second, first)
}

/** Hôtes des liens courts de Google Maps : la position n'est pas dans l'adresse. */
function isShortLinkHost(hostname: string): boolean {
  return hostname === 'maps.app.goo.gl' || hostname === 'goo.gl' || hostname === 'g.co'
}

/**
 * Position contenue dans l'adresse d'un lien de carte (Google Maps, Plans...).
 * Les formes sont essayées de la plus précise à la moins précise.
 */
export function positionFromUrl(url: URL, depth = 0): LatLng | null {
  const href = decodeURIComponent(url.href)

  // 1. Emplacement exact du lieu dans un lien Google Maps : !3d<lat>!4d<lng>
  const place = new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`).exec(href)
  if (place) return toPosition(Number(place[1]), Number(place[2]))

  // 2. Paramètres usuels : ?q=lat,lng, ?query=, ?ll=, ?destination=...
  for (const name of ['q', 'query', 'll', 'sll', 'destination', 'daddr', 'center', 'coordinate']) {
    const found = fromPair(url.searchParams.get(name))
    if (found) return found
  }

  // 3. Dans le chemin : /place/lat,lng ou /search/lat,lng
  const inPath = new RegExp(`/(?:place|search|dir)/(${NUMBER}),\\+?(${NUMBER})`).exec(href)
  if (inPath) return toPosition(Number(inPath[1]), Number(inPath[2]))
  const dms = fromDms(href.replace(/\+/g, ' '))
  if (dms) return dms

  // 4. Centre de la vue : /@lat,lng,zoom (moins précis : c'est le centre de l'écran)
  const view = new RegExp(`/@(${NUMBER}),(${NUMBER})`).exec(href)
  if (view) return toPosition(Number(view[1]), Number(view[2]))

  // 5. Page intermédiaire de Google (consentement) : le vrai lien est dans "continue".
  const next = url.searchParams.get('continue')
  if (next && depth < 2) {
    try {
      return positionFromUrl(new URL(next), depth + 1)
    } catch {
      return null
    }
  }
  return null
}

export function parseLocation(input: string): ParsedLocation {
  const text = input.trim()
  if (!text) return { kind: 'unknown' }

  // "geo:44.8009,4.2530" : lien de position standard.
  const geo = new RegExp(`^geo:(${NUMBER}),(${NUMBER})`, 'i').exec(text)
  if (geo) {
    const position = toPosition(Number(geo[1]), Number(geo[2]))
    return position ? { kind: 'coordinates', position } : { kind: 'unknown' }
  }

  // Un lien, éventuellement précédé d'un texte ("Tour Eiffel https://maps.app.goo.gl/...").
  const link = /https?:\/\/\S+/i.exec(text)
  if (link) {
    try {
      const url = new URL(link[0])
      const position = positionFromUrl(url)
      if (position) return { kind: 'coordinates', position }
      if (isShortLinkHost(url.hostname)) return { kind: 'short_link', url: url.href }
    } catch {
      // Lien illisible : on tente la suite.
    }
    return { kind: 'unknown' }
  }

  // Coordonnées seules, éventuellement entre parenthèses : "(44.8009, 4.2530)".
  const bare = fromPair(text.replace(/^[([]\s*|\s*[)\]]$/g, '')) ?? fromDms(text)
  return bare ? { kind: 'coordinates', position: bare } : { kind: 'unknown' }
}
