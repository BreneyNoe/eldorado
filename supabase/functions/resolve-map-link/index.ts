// =====================================================================
// FONCTION "resolve-map-link"
// =====================================================================
// Un lien court de Google Maps (https://maps.app.goo.gl/...) ne contient
// pas la position : il faut le suivre pour savoir où il mène. Un
// navigateur n'en a pas le droit depuis une page web (règles de sécurité
// des navigateurs). Cette petite fonction, hébergée gratuitement par
// Supabase, le fait à sa place et renvoie les coordonnées.
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

function valid(lat: number, lng: number): { lat: number; lng: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) return null
  return { lat, lng }
}

/**
 * Cherche une position dans un texte : adresse d'un lien, ou contenu d'une page.
 * Les formes sont essayées de la plus précise à la moins précise.
 */
function findPosition(text: string): { lat: number; lng: number } | null {
  // Les adresses arrivent souvent encodées ("%2C" pour une virgule, "%40" pour "@").
  const decoded = text.replace(/%2C/gi, ',').replace(/%40/g, '@').replace(/%21/g, '!')

  // [motif, vrai si la longitude vient avant la latitude]
  const patterns: [RegExp, boolean][] = [
    // Emplacement exact d'un lieu.
    [new RegExp(`!3d(${NUMBER})!4d(${NUMBER})`), false],
    [new RegExp(`[?&](?:q|query|ll|destination|daddr|center|sll)=(${NUMBER}),\\+?(${NUMBER})`), false],
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

// Sans ces cookies, Google répond depuis l'Europe par une page de consentement, sans aucune donnée.
const GOOGLE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
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

  // Sites traversés, pour le diagnostic en cas d'échec (jamais l'adresse complète).
  const hops: string[] = []
  try {
    let current = link
    for (let hop = 0; hop < MAX_HOPS; hop += 1) {
      hops.push(current.hostname)
      const fromAddress = findPosition(current.href)
      if (fromAddress) return json(fromAddress)

      // Page de consentement : le vrai lien est dans son paramètre "continue".
      if (current.hostname.startsWith('consent.')) {
        const next = current.searchParams.get('continue')
        if (!next) return json({ error: 'position_not_found', detail: hops.join(' > ') }, 404)
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

      // Plus de redirection : la position est parfois dans le contenu de la page.
      const page = (await response.text()).slice(0, 600_000)
      const fromPage = findPosition(page)
      return fromPage
        ? json(fromPage)
        : json({ error: 'position_not_found', detail: `${hops.join(' > ')} (${response.status})` }, 404)
    }
    return json({ error: 'position_not_found', detail: `${hops.join(' > ')} (trop de redirections)` }, 404)
  } catch (error) {
    return json({ error: 'fetch_failed', detail: `${hops.join(' > ')} : ${error instanceof Error ? error.message : 'erreur'}` }, 502)
  }
})
