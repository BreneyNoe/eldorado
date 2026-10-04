/**
 * Moteur de carte : tout ce qui touche à MapLibre est dans ce dossier.
 *
 * Le reste de l'application ne connaît que l'interface SpotMapEngine
 * ci-dessous. Remplacer MapLibre par une autre bibliothèque reviendrait à
 * réécrire ce dossier, sans toucher aux écrans.
 */
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
} from 'maplibre-gl'
// MapLibre fait ses calculs lourds dans un "worker" (un fil d'exécution à
// part). "?worker&url" demande à Vite de préparer ce fichier et de nous en
// donner l'adresse, valable aussi bien en développement qu'une fois le site
// construit.
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { clusterDiameter, createClusterImage, createPinImage, PIN_RADIUS } from '@/features/map/engine/pinImages'
import { SATELLITE_ATTRIBUTION } from '@/config/constants'
import { FOCUS_ZOOM, type MapBounds, type MapView } from '@/features/map/logic/mapView'
import { buildSatelliteStyle, type BaseStyle } from '@/features/map/logic/satelliteStyle'
import {
  parseImageId,
  UNKNOWN_TYPE_ID,
  type SpotFeatureCollection,
} from '@/features/map/logic/spotsToGeoJson'
import { UNKNOWN_TYPE_COLOR } from '@/features/spots/logic/spotIcons'

setWorkerUrl(mapLibreWorkerUrl)

const SOURCE_ID = 'spots'
const LAYER_CLUSTERS = 'spots-clusters'
const LAYER_POINTS = 'spots-points'
const LAYER_SELECTED = 'spots-selected'

/** Distance (en pixels d'écran) en dessous de laquelle des spots se regroupent. */
const CLUSTER_RADIUS = 48
/** Au-delà de ce zoom, plus aucun regroupement : chaque spot est visible. */
const CLUSTER_MAX_ZOOM = 14
/** Marge de tolérance autour du doigt, pour toucher un marqueur sans viser. */
const TAP_TOLERANCE = 14

const EMPTY_COLLECTION: SpotFeatureCollection = { type: 'FeatureCollection', features: [] }

export interface PinStyle {
  color: string
  icon: string
}

/** Fond de carte : le plan habituel, ou les photos aériennes avec les cours d'eau par-dessus. */
export type BasemapMode = 'plan' | 'satellite'

export interface SpotMapEngineOptions {
  container: HTMLElement
  styleUrl: string
  /** Modèle d'adresse des images de la vue satellite, avec {z}, {x} et {y}. */
  satelliteTilesUrl: string
  initialBasemap: BasemapMode
  initialView: MapView
  /** Un marqueur a été touché (id du spot), ou le fond de carte (null). */
  onSelect: (spotId: string | null) => void
  /** La caméra s'est arrêtée : nouvelle position et rectangle visible. */
  onViewChange: (view: MapView, bounds: MapBounds) => void
  /** Le fond de carte est prêt (true) ou n'a pas pu être chargé (false). */
  onBasemapStatus: (ready: boolean) => void
}

export interface FocusOptions {
  minZoom?: number
  bottomInset?: number
  animate?: boolean
}

export interface SpotMapEngine {
  setSpots: (collection: SpotFeatureCollection) => void
  /** Couleur et icône de chaque type, indexées par id de type. */
  setPinStyles: (styles: Record<string, PinStyle>) => void
  setSelected: (spotId: string | null) => void
  setUserLocation: (position: { lat: number; lng: number } | null) => void
  /**
   * Centre la carte sur un point.
   * `bottomInset` : hauteur (en pixels) masquée en bas par un panneau ; le
   * point est alors centré dans la partie réellement visible.
   * `animate: false` : déplacement immédiat, utilisé à l'ouverture de la carte.
   */
  focusOn: (position: { lat: number; lng: number }, options?: FocusOptions) => void
  fitBounds: (bounds: MapBounds) => void
  /** Retente le chargement du fond de carte après un échec. */
  reloadBasemap: () => void
  /** Bascule entre le plan et la vue satellite. Les spots restent affichés. */
  setBasemap: (mode: BasemapMode) => void
  destroy: () => void
}

function createUserDot(): HTMLElement {
  const dot = document.createElement('div')
  dot.className = 'user-location-dot'
  dot.setAttribute('aria-hidden', 'true')
  return dot
}

export function createSpotMapEngine(options: SpotMapEngineOptions): SpotMapEngine {
  const { container, styleUrl, satelliteTilesUrl, initialView, onSelect, onViewChange, onBasemapStatus } = options
  let basemap: BasemapMode = options.initialBasemap
  // Style du plan, téléchargé une seule fois : la vue satellite en reprend les données des cours d'eau.
  let planStyle: Promise<BaseStyle> | null = null

  let spots: SpotFeatureCollection = EMPTY_COLLECTION
  let pinStyles: Record<string, PinStyle> = {}
  let selectedSpotId: string | null = null
  let overlayReady = false
  let destroyed = false
  let userMarker: Marker | null = null

  const map = new MapLibreMap({
    container,
    // En vue satellite, la carte démarre vide : son style est fabriqué juste après (applyBasemap).
    style: basemap === 'plan' ? styleUrl : { version: 8, sources: {}, layers: [] },
    center: [initialView.lng, initialView.lat],
    zoom: initialView.zoom,
    attributionControl: false,
    // Carte toujours orientée au nord et vue du dessus : plus simple à lire
    // et aucun geste accidentel de rotation ou d'inclinaison.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    rollEnabled: false,
    maxPitch: 0,
  })
  map.touchZoomRotate.disableRotation()
  map.keyboard.disableRotation()
  map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

  // --- Images des marqueurs, fabriquées à la demande ---------------------
  map.setMissingStyleImageResolver(async (id) => {
    const parsed = parseImageId(id)
    if (!parsed) return // image du fond de carte : ce n'est pas à nous de la fournir

    try {
      if (parsed.kind === 'cluster') {
        const { image, pixelRatio } = await createClusterImage(parsed.label)
        if (!destroyed && !map.hasImage(id)) map.addImage(id, image, { pixelRatio })
        return
      }

      const style = parsed.typeId === UNKNOWN_TYPE_ID ? undefined : pinStyles[parsed.typeId]
      const { image, pixelRatio } = await createPinImage(
        style?.color ?? UNKNOWN_TYPE_COLOR,
        style?.icon,
        parsed.selected,
      )
      if (!destroyed && !map.hasImage(id)) map.addImage(id, image, { pixelRatio })
    } catch (error) {
      console.error(`Image de carte impossible à créer : ${id}`, error)
    }
  })

  function selectedFilter(): ['==', ['get', string], string] {
    return ['==', ['get', 'spotId'], selectedSpotId ?? '']
  }

  /** Ajoute la source et les couches des spots par-dessus le fond de carte. */
  function installOverlay() {
    if (map.getSource(SOURCE_ID)) return

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: spots,
      cluster: true,
      clusterRadius: CLUSTER_RADIUS,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    })

    // "allow-overlap" + "ignore-placement" : nos marqueurs s'affichent toujours,
    // sans entrer en concurrence avec les libellés du fond de carte.
    map.addLayer({
      id: LAYER_CLUSTERS,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'icon-image': ['concat', 'cluster/', ['to-string', ['get', 'point_count_abbreviated']]],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    })
    map.addLayer({
      id: LAYER_POINTS,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['get', 'pin'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    })
    map.addLayer({
      id: LAYER_SELECTED,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['all', ['!', ['has', 'point_count']], selectedFilter()],
      layout: {
        'icon-image': ['get', 'pinSelected'],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    })

    overlayReady = true
  }

  // "style.load" se déclenche au premier chargement et après chaque
  // rechargement du fond de carte : on réinstalle alors nos couches.
  map.on('style.load', () => {
    overlayReady = false
    installOverlay()
    onBasemapStatus(true)
  })

  map.on('error', (event) => {
    // Tant que le style n'est pas chargé, une erreur signifie que le fond de
    // carte est indisponible. Ensuite, ce sont des tuiles isolées : on ignore.
    if (!map.isStyleLoaded() && !overlayReady) onBasemapStatus(false)
    console.warn('Carte :', event.error?.message ?? event)
  })

  function reportView() {
    const center = map.getCenter()
    const bounds = map.getBounds()
    onViewChange({ lng: center.lng, lat: center.lat, zoom: map.getZoom() }, [
      [bounds.getWest(), bounds.getSouth()],
      [bounds.getEast(), bounds.getNorth()],
    ])
  }

  map.on('moveend', reportView)
  // Position de départ : aucun déplacement n'a encore eu lieu, on la signale nous-mêmes.
  map.once('load', reportView)

  /**
   * Marqueur ou regroupement le plus proche d'un point de l'écran, dans la
   * limite de sa taille plus une marge de tolérance.
   *
   * On part des données de la source plutôt que de ce que la carte a déjà
   * dessiné : le résultat ne dépend pas du moment où MapLibre replace ses
   * symboles après un changement, et c'est bien le plus proche du doigt qui
   * est retenu quand deux marqueurs sont voisins.
   */
  function featureNear(point: { x: number; y: number }) {
    let nearest: { properties: Record<string, unknown>; coordinates: [number, number] } | null = null
    let nearestDistance = Infinity

    for (const feature of map.querySourceFeatures(SOURCE_ID)) {
      if (feature.geometry.type !== 'Point') continue
      const coordinates = feature.geometry.coordinates as [number, number]
      const properties = (feature.properties ?? {}) as Record<string, unknown>

      const isCluster = typeof properties.cluster_id === 'number'
      const radius = isCluster
        ? clusterDiameter(String(properties.point_count_abbreviated ?? '')) / 2
        : PIN_RADIUS
      const position = map.project(coordinates)
      const distance = Math.hypot(position.x - point.x, position.y - point.y)

      if (distance <= radius + TAP_TOLERANCE && distance < nearestDistance) {
        nearest = { properties, coordinates }
        nearestDistance = distance
      }
    }
    return nearest
  }

  map.on('click', (event) => {
    if (!overlayReady) return
    const target = featureNear(event.point)
    if (!target) {
      onSelect(null)
      return
    }

    const clusterId = target.properties.cluster_id
    if (typeof clusterId === 'number') {
      // Regroupement : on zoome juste assez pour qu'il se sépare.
      const source = map.getSource<GeoJSONSource>(SOURCE_ID)
      void source
        ?.getClusterExpansionZoom(clusterId)
        .then((zoom) => {
          if (!destroyed) map.easeTo({ center: target.coordinates, zoom: zoom + 0.5 })
        })
        .catch(() => undefined)
      return
    }

    const spotId = target.properties.spotId
    onSelect(typeof spotId === 'string' ? spotId : null)
  })

  // Curseur "main" au survol d'un marqueur (utile sur ordinateur).
  for (const layer of [LAYER_POINTS, LAYER_CLUSTERS, LAYER_SELECTED]) {
    map.on('mouseenter', layer, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', layer, () => {
      map.getCanvas().style.cursor = ''
    })
  }

  /**
   * Applique le fond de carte demandé. À chaque changement de style, MapLibre
   * déclenche "style.load" : nos couches de spots sont alors réinstallées.
   */
  function applyBasemap() {
    if (basemap === 'plan') {
      map.setStyle(styleUrl, { diff: false })
      return
    }
    planStyle ??= fetch(styleUrl).then((response) => {
      if (!response.ok) throw new Error(`style ${response.status}`)
      return response.json() as Promise<BaseStyle>
    })
    planStyle
      .then((base) => {
        // Entre-temps, la carte a pu être fermée ou l'utilisateur revenir au plan.
        if (destroyed || basemap !== 'satellite') return
        const style = buildSatelliteStyle(base, { tilesUrl: satelliteTilesUrl, attribution: SATELLITE_ATTRIBUTION })
        map.setStyle(style as unknown as StyleSpecification, { diff: false })
      })
      .catch((error: unknown) => {
        planStyle = null // on retentera au prochain essai
        if (!destroyed) onBasemapStatus(false)
        console.warn('Vue satellite indisponible :', error)
      })
  }

  if (basemap === 'satellite') applyBasemap()

  return {
    setSpots(collection) {
      spots = collection
      if (overlayReady) map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(collection)
    },

    setPinStyles(styles) {
      const previous = pinStyles
      pinStyles = styles
      // Un type dont la couleur ou l'icône a changé : on oublie son image,
      // elle sera refabriquée au prochain affichage.
      for (const [typeId, style] of Object.entries(styles)) {
        const before = previous[typeId]
        if (before && before.color === style.color && before.icon === style.icon) continue
        for (const id of [`pin/${typeId}`, `pin-selected/${typeId}`]) {
          if (map.hasImage(id)) map.removeImage(id)
        }
      }
      if (overlayReady) map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(spots)
    },

    setSelected(spotId) {
      selectedSpotId = spotId
      if (!overlayReady) return
      map.setFilter(LAYER_SELECTED, ['all', ['!', ['has', 'point_count']], selectedFilter()])
    },

    setUserLocation(position) {
      if (!position) {
        userMarker?.remove()
        userMarker = null
        return
      }
      userMarker ??= new Marker({ element: createUserDot() }).setLngLat([position.lng, position.lat]).addTo(map)
      userMarker.setLngLat([position.lng, position.lat])
    },

    focusOn(position, { minZoom = FOCUS_ZOOM, bottomInset = 0, animate = true } = {}) {
      const center: [number, number] = [position.lng, position.lat]
      const zoom = Math.max(map.getZoom(), minZoom)
      // Le point est décalé vers le haut de la moitié de la zone masquée.
      if (animate) {
        map.easeTo({ center, zoom, offset: [0, -bottomInset / 2] })
      } else {
        map.jumpTo({ center, zoom })
        if (bottomInset > 0) map.panBy([0, bottomInset / 2], { animate: false })
      }
    },

    fitBounds(bounds) {
      map.fitBounds(bounds, { padding: 64, maxZoom: 13, animate: false })
    },

    reloadBasemap() {
      applyBasemap()
    },

    setBasemap(mode) {
      if (mode === basemap) return
      basemap = mode
      applyBasemap()
    },

    destroy() {
      destroyed = true
      userMarker?.remove()
      map.remove()
    },
  }
}
