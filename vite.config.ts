/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Transforme un début d'adresse en motif reconnu par le service worker.
 *
 * @param exceptApi  exclut les adresses de l'API Supabase. Ceinture et bretelles :
 *                   les données et l'authentification ne doivent jamais être servies
 *                   depuis une copie, même si un fond de carte était un jour hébergé
 *                   à la même adresse que Supabase.
 */
function startsWith(prefix: string, exceptApi = false): RegExp {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped}${exceptApi ? '(?!/(?:rest|auth|functions|storage|realtime)/v1/)' : ''}`)
}

function originOf(url: string, fallback: string): string {
  try {
    return new URL(url.replace(/[{}]/g, '')).origin
  } catch {
    return fallback
  }
}

const DAY = 24 * 60 * 60

/**
 * Ajoute à la page construite une politique de sécurité du contenu (CSP) et
 * des connexions anticipées vers les serveurs utilisés.
 *
 * La CSP est une seconde ligne de défense : si, malgré tout, du code
 * malveillant arrivait dans la page (un texte saisi par un utilisateur, par
 * exemple), le navigateur refuserait de l'exécuter, car seuls les scripts de
 * l'application elle-même sont autorisés.
 *
 * Elle n'est posée qu'à la construction : en développement, Vite a besoin
 * de scripts que cette politique interdirait.
 *
 * @param origins  serveurs configurés (Supabase, fond de carte, images, adresses)
 */
function contentSecurity(origins: string[]): Plugin {
  const allowed = [...new Set(origins.filter(Boolean))]
  return {
    name: 'spots-content-security',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Le petit script d'affichage des erreurs de démarrage est écrit dans la page :
        // on l'autorise par son empreinte, sans autoriser aucun autre script en ligne.
        const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
          (match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`.trim(),
          // Les styles en ligne sont nécessaires à MapLibre et aux couleurs des types.
          "style-src 'self' 'unsafe-inline'",
          `img-src 'self' data: blob: https: ${allowed.join(' ')}`.trim(),
          "font-src 'self' data:",
          `connect-src 'self' https: wss: ${allowed.join(' ')}`.trim(),
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')

        return {
          html,
          tags: [
            { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
            // Limite ce que les autres sites apprennent de l'adresse d'où l'on vient.
            { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head' },
            ...allowed
              .filter((origin) => origin.startsWith('https://'))
              .slice(0, 3)
              .map((origin) => ({ tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' as const })),
          ],
        }
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Lit les fichiers .env, .env.local, .env.production... (variables VITE_ uniquement).
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Adresses dont le service worker garde une copie pour l'usage hors ligne.
  const supabasePhotos = `${(env.VITE_SUPABASE_URL || 'https://invalid.supabase.co').replace(/\/+$/, '')}/storage/v1/object/public/`
  const mapOrigin = originOf(env.VITE_MAP_STYLE_URL || '', 'https://tiles.openfreemap.org')
  const satelliteOrigin = originOf(env.VITE_SATELLITE_TILES_URL || '', 'https://data.geopf.fr')
  const supabaseOrigin = originOf(env.VITE_SUPABASE_URL || '', '')
  const geocoderOrigin = originOf(env.VITE_GEOCODER_URL || '', 'https://nominatim.openstreetmap.org')

  const pwa = VitePWA({
    // Une nouvelle version n'est jamais appliquée en plein usage : l'application
    // propose de se mettre à jour (voir src/app/UpdatePrompt.tsx).
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'Eldorado',
      short_name: 'Eldorado',
      description: 'Carte collaborative de spots, entre amis.',
      lang: 'fr',
      // Adresses relatives : valables aussi bien en local que sous /nom-du-depot/ sur GitHub Pages.
      start_url: '.',
      scope: '.',
      display: 'standalone',
      // Couleur de l'écran de lancement : le vert de l'icône.
      background_color: '#067302',
      theme_color: '#16233b',
      icons: [
        { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Tout le code de l'application est gardé sur l'appareil : elle s'ouvre sans réseau.
      globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      navigateFallback: 'index.html',
      cleanupOutdatedCaches: true,
      // Ce qui suit est gardé au fil de l'usage. Les données (spots, notes, updates)
      // n'y figurent pas : elles sont mémorisées par l'application elle-même, et
      // les appels à l'API ou à l'authentification ne sont jamais mis en cache ici.
      runtimeCaching: [
        {
          // Photos : un fichier ne change jamais (son nom est unique), la copie locale suffit.
          urlPattern: startsWith(supabasePhotos),
          handler: 'CacheFirst',
          options: {
            cacheName: 'spot-photos',
            expiration: { maxEntries: 400, maxAgeSeconds: 60 * DAY, purgeOnQuotaError: true },
            // 0 : réponse "opaque", celle d'une image chargée depuis un autre site.
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Fond de carte : la copie locale s'affiche tout de suite, et se rafraîchit en arrière-plan.
          urlPattern: startsWith(mapOrigin, true),
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'map-tiles',
            expiration: { maxEntries: 1000, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: startsWith(satelliteOrigin, true),
          handler: 'CacheFirst',
          options: {
            cacheName: 'satellite-tiles',
            expiration: { maxEntries: 600, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
  })

  return {
    // En local : "/". Sur GitHub Pages : "/nom-du-depot/" (voir .env.example).
    base: env.VITE_BASE_PATH || '/',
    // Mode "https" (npm run dev:https) : certificat local auto-signé, pour
    // tester sur un téléphone la localisation et la caméra, qui exigent https.
    plugins: [
      react(),
      tailwindcss(),
      pwa,
      // Supabase et le fond de carte d'abord : ce sont eux qui profitent des connexions anticipées.
      contentSecurity([supabaseOrigin, mapOrigin, satelliteOrigin, geocoderOrigin]),
      ...(mode === 'https' ? [basicSsl()] : []),
    ],
    // Le worker de MapLibre est un module JavaScript moderne.
    worker: { format: 'es' as const },
    resolve: {
      // Permet d'écrire "@/lib/errors" au lieu de "../../lib/errors".
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      // MapLibre pèse environ 1 Mo à lui seul. Il est isolé dans un fichier
      // chargé après la connexion : inutile que Vite le signale à chaque build.
      chunkSizeWarningLimit: 1200,
    },
    test: {
      // "npm run test:coverage" : part du code exécutée par les tests, fichier par fichier.
      coverage: {
        provider: 'v8',
        reporter: ['text-summary', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/types/**', 'src/**/*.d.ts', 'src/main.tsx'],
      },
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
})
