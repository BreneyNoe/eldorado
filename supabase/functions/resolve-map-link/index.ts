// =====================================================================
// FONCTION "resolve-map-link"
// =====================================================================
// Un lien court de Google Maps (https://maps.app.goo.gl/...) ne contient
// pas la position : il faut le suivre pour savoir où il mène. Un
// navigateur n'en a pas le droit depuis une page web (règles de sécurité
// des navigateurs). Cette petite fonction, hébergée gratuitement par
// Supabase, le fait à sa place et renvoie les coordonnées.
//
// Trois façons de trouver la position, de la plus sûre à la moins sûre :
//   1. des coordonnées écrites dans l'une des adresses traversées
//      (repère posé à la main, lien copié depuis un ordinateur) : exact ;
//   2. le nom et l'adresse du lieu, cherchés dans OpenStreetMap : proche ;
//   3. l'identifiant du lieu, qui code sa zone géographique : approximatif.
// Dans les cas 2 et 3 la réponse porte "approximate: true", et
// l'application demande de vérifier le repère sur la carte.
//
// Pourquoi ne pas lire la page du lieu chez Google ? Google refuse les
// lectures venant de serveurs (erreur 429). On s'en passe donc.
//
// Sécurité :
//   - réservée aux utilisateurs connectés : la fonction vérifie elle-même
//     la session de l'appelant auprès de Supabase Auth ;
//   - elle ne suit que des adresses de Google : impossible de s'en servir
//     pour atteindre un autre site.
//
// Déploiement : voir docs/google-maps.md.
// =====================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const NUMBER = String.raw`-?\d{1,3}(?:\.\d+)?`
const MAX_HOPS = 6
const GEOCODER = 'https://nominatim.openstreetmap.org/search'

interface Position {
  lat: number
  lng: number
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function isGoogleHost(hostname: string): boolean {
  return (
    hostname === 'maps.app.goo.gl' ||
    hostname === 'goo.gl' ||
    hostname === 'g.co' ||
    hostname === 'google.com' ||
    hostname.endsWith('.google.com') ||
    /^(?:www\.|maps\.)?google\.[a-z.]{2,6}$/.test(hostname)
  )
}

function valid(lat: number, lng: number): Position | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null
  return { lat, lng }
}

/** Distance en kilomètres entre deux points (formule de haversine). */
function distanceKm(a: Position, b: Position): number {
  const rad = Math.PI / 180
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/** Coordonnées écrites en clair dans un texte (adresse d'un lien, le plus souvent). */
function findPosition(text: string): Position | null {
  // Les adresses arrivent souvent encodées ("%2C" pour une virgule, "%40" pour "@").
  const decoded = text.replace(/%2C/gi, ',').replace(/%40/g, '@').replace(/%21/g, '!')

  // [motif, vrai si la longitude vient avant la latitude]
  const patterns: [RegExp, boolean][] = [
    // Emplacement exact d'un lieu.
    [new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`), false],
    [new RegExp(`[?&](?:q|query|ll|destination|daddr|center|sll)=(${NUMBER}),\\+?(${NUMBER})(?:[&#]|$)`), false],
    [new RegExp(`/(?:place|search|dir)/(${NUMBER}),\\+?(${NUMBER})`), false],
    [new RegExp(`/@(${NUMBER}),(${NUMBER})`), false],
    // Contenu d'une page Google Maps : état initial de la carte [zoom, longitude, latitude].
    [new RegExp(`APP_INITIALIZATION_STATE=\\[\\[\\[-?\\d+(?:\\.\\d+)?,(${NUMBER}),(${NUMBER})\\]`), true],
  ]
  for (const [pattern, longitudeFirst] of patterns) {
    const match = pattern.exec(decoded)
    if (match) {
      const first = Number(match[1])
      const second = Number(match[2])
      const found = longitudeFirst ? valid(second, first) : valid(first, second)
      if (found) return found
    }
  }
  return null
}

// --- Zone géographique codée dans l'identifiant d'un lieu ----------------------
//
// Un lien vers un lieu connu de Google contient son identifiant, de la forme
// 0x47e66e2964e34e2d:0x8ddca9ee380ef7e0. Sa première moitié est une "cellule
// S2" : une case d'un quadrillage de la Terre, proche du lieu (de quelques
// dizaines de mètres à quelques kilomètres). On en calcule le centre.

const POS_TO_IJ = [
  [0, 1, 3, 2],
  [0, 2, 3, 1],
  [3, 2, 0, 1],
  [3, 1, 0, 2],
]
const POS_TO_ORIENTATION = [1, 0, 0, 3]

function s2CellCenter(hex: string): Position | null {
  let id: bigint
  try {
    id = BigInt(hex)
  } catch {
    return null
  }
  if (id <= 0n || id >= 6n << 61n) return null

  const face = Number(id >> 61n)
  let orientation = face & 1
  let i = 0
  let j = 0
  for (let level = 1; level <= 30; level += 1) {
    const pos = Number((id >> BigInt(2 * (30 - level) + 1)) & 3n)
    const ij = POS_TO_IJ[orientation][pos]
    i = i * 2 + (ij >> 1)
    j = j * 2 + (ij & 1)
    orientation ^= POS_TO_ORIENTATION[pos]
  }
  const isLeaf = (id & 1n) === 1n
  const delta = isLeaf ? 1 : ((BigInt(i) ^ (id >> 2n)) & 1n) === 1n ? 2 : 0
  const toSt = (value: number) => (2 * value + delta) / 2 ** 31
  const toUv = (s: number) => (s >= 0.5 ? (4 * s * s - 1) / 3 : (1 - 4 * (1 - s) * (1 - s)) / 3)
  const u = toUv(toSt(i))
  const v = toUv(toSt(j))
  const [x, y, z] = [
    [1, u, v],
    [-u, 1, v],
    [-u, -v, 1],
    [-1, -v, -u],
    [v, -1, -u],
    [v, u, -1],
  ][face]
  const degrees = 180 / Math.PI
  return valid(Math.atan2(z, Math.hypot(x, y)) * degrees, Math.atan2(y, x) * degrees)
}

/** Zone approximative d'un lieu, d'après l'identifiant présent dans une adresse Google Maps. */
function areaFromPlaceId(text: string): Position | null {
  const match = /(0x[0-9a-f]{8,16}):0x[0-9a-f]{8,16}/i.exec(decodeSafely(text))
  return match ? s2CellCenter(match[1]) : null
}

function decodeSafely(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

/** Nom (et adresse) du lieu, tel qu'il figure dans l'adresse du lien. */
function placeText(url: URL): string | null {
  const fromQuery = url.searchParams.get('q') ?? url.searchParams.get('query')
  const fromPath = /\/maps\/place\/([^/@]+)/.exec(url.pathname)?.[1]
  const raw = fromQuery ?? (fromPath ? decodeSafely(fromPath).replace(/\+/g, ' ') : null)
  const text = raw?.trim() ?? ''
  // Trop court, ou déjà des coordonnées : rien à chercher par le nom.
  if (text.length < 3 || new RegExp(`^${NUMBER},\\s*${NUMBER}$`).test(text)) return null
  return text.slice(0, 200)
}

/**
 * Cherche un lieu par son nom dans OpenStreetMap (Nominatim).
 * @param near  zone approximative connue : le résultat doit s'y trouver
 */
async function geocode(text: string, near: Position | null): Promise<Position | null> {
  // "Nom, rue, ville" : on essaie le texte entier, puis sans le nom (l'adresse seule).
  const attempts = [text]
  const comma = text.indexOf(',')
  if (comma > 0 && text.length - comma > 6) attempts.push(text.slice(comma + 1).trim())

  for (const attempt of attempts) {
    const url = new URL(GEOCODER)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('limit', '1')
    url.searchParams.set('accept-language', 'fr')
    url.searchParams.set('q', attempt)
    if (near) {
      // Préfère les résultats proches de la zone connue (0,2 degré : une vingtaine de kilomètres).
      url.searchParams.set('viewbox', `${near.lng - 0.2},${near.lat + 0.2},${near.lng + 0.2},${near.lat - 0.2}`)
    }
    try {
      const response = await fetch(url, {
        // Nominatim demande que l'application se présente.
        headers: { 'User-Agent': 'Eldorado (application privee de partage de spots) - resolve-map-link' },
      })
      if (!response.ok) continue
      const results = (await response.json()) as { lat?: string; lon?: string }[]
      const found = results[0] ? valid(Number(results[0].lat), Number(results[0].lon)) : null
      // Un homonyme à l'autre bout du pays ne vaut rien : on exige la proximité de la zone connue.
      if (found && (!near || distanceKm(found, near) <= 25)) return found
    } catch {
      // Service injoignable : on passe à la suite.
    }
  }
  return null
}

// Sans ces cookies, Google répond depuis l'Europe par une page de consentement, sans aucune donnée.
const GOOGLE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  Cookie: 'CONSENT=YES+cb; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
}

/** Vrai si l'appelant est connecté à l'application (session valide auprès de Supabase Auth). */
async function isSignedIn(request: Request): Promise<boolean> {
  const authorization = request.headers.get('Authorization') ?? ''
  const projectUrl = Deno.env.get('SUPABASE_URL')
  if (!authorization.startsWith('Bearer ') || !projectUrl) return false
  try {
    const response = await fetch(`${projectUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: request.headers.get('apikey') ?? '' },
    })
    return response.ok
  } catch {
    return false
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!(await isSignedIn(request))) return json({ error: 'unauthorized' }, 401)

  let link: URL
  try {
    const body = await request.json()
    link = new URL(String(body?.url ?? ''))
  } catch {
    return json({ error: 'invalid_url' }, 400)
  }
  if (link.protocol !== 'https:' || !isGoogleHost(link.hostname)) return json({ error: 'unsupported_host' }, 400)

  // Sites traversés, pour le diagnostic en cas d'échec.
  const hops: string[] = []
  // Indices relevés en chemin, utilisés si aucune coordonnée exacte n'est trouvée.
  let area: Position | null = null
  let name: string | null = null
  let lastStatus = ''

  try {
    let current = link
    for (let hop = 0; hop < MAX_HOPS; hop += 1) {
      hops.push(current.hostname)

      // 1. Des coordonnées en clair : c'est la position exacte.
      const exact = findPosition(current.href)
      if (exact) return json(exact)

      area = area ?? areaFromPlaceId(current.href)
      name = name ?? placeText(current)

      // Page de consentement : le vrai lien est dans son paramètre "continue".
      if (current.hostname.startsWith('consent.')) {
        const next = current.searchParams.get('continue')
        if (!next) break
        const target = new URL(next)
        if (target.protocol !== 'https:' || !isGoogleHost(target.hostname)) return json({ error: 'unsupported_host' }, 400)
        current = target
        continue
      }

      // On suit les redirections une par une, pour vérifier chaque destination.
      const response = await fetch(current, { redirect: 'manual', headers: GOOGLE_HEADERS })
      const location = response.headers.get('location')
      if (response.status >= 300 && response.status < 400 && location) {
        const next = new URL(location, current)
        if (next.protocol !== 'https:' || !isGoogleHost(next.hostname)) return json({ error: 'unsupported_host' }, 400)
        current = next
        continue
      }

      // Plus de redirection. Si Google accepte de servir la page, la position y figure parfois.
      lastStatus = ` (${response.status})`
      if (response.ok) {
        const fromPage = findPosition((await response.text()).slice(0, 600_000))
        if (fromPage) return json(fromPage)
      }
      break
    }
  } catch (error) {
    // On ne renonce pas : les indices déjà relevés peuvent suffire.
    lastStatus = ` (${error instanceof Error ? error.message : 'erreur'})`
  }

  // 2. Le lieu cherché par son nom, à condition qu'il tombe dans la zone attendue.
  if (name) {
    const byName = await geocode(name, area)
    if (byName) return json({ ...byName, approximate: true, source: 'name' })
  }
  // 3. À défaut, le centre de la zone codée dans l'identifiant du lieu.
  if (area) return json({ ...area, approximate: true, source: 'area' })

  return json({ error: 'position_not_found', detail: `${hops.join(' > ')}${lastStatus}` }, 404)
})
