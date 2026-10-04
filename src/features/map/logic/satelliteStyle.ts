/**
 * Fabrique le style de la vue satellite : des photos aériennes, avec par
 * dessus le tracé et le nom des cours d'eau, et le nom des communes.
 *
 * Les cours d'eau ne sont pas redessinés à partir d'une autre source : ils
 * viennent des mêmes données que le plan habituel (OpenStreetMap), que l'on
 * superpose simplement à l'image. La fonction part donc du style du plan et
 * en reprend la source de données et les polices.
 *
 * Fonction pure : aucune dépendance à MapLibre, facile à tester.
 */

/** Sous-ensemble d'un style MapLibre dont on a besoin ici. */
export interface BaseStyle {
  glyphs?: string
  sources?: Record<string, { type?: string } & Record<string, unknown>>
  layers?: {
    type?: string
    source?: string
    'source-layer'?: string
    layout?: Record<string, unknown>
  }[]
}

export interface SatelliteStyleOptions {
  /** Modèle d'adresse des images, avec {z}, {x} et {y}. */
  tilesUrl: string
  /** Mention légale du fournisseur d'images. */
  attribution: string
  /** Zoom maximal fourni par le service d'images. */
  maxZoom?: number
}

const RIVER_BLUE = '#5cc8ff'
const DARK_EDGE = '#0b2545'
const LABEL_LIGHT = '#eaf6ff'

/** Source de données vectorielles du plan qui contient les cours d'eau, et la police de leurs libellés. */
function findWaterway(base: BaseStyle): { sourceId: string | null; font: unknown } {
  const layers = base.layers ?? []
  const sources = base.sources ?? {}

  const waterwayLayer = layers.find((layer) => layer['source-layer'] === 'waterway' && layer.source)
  const sourceId =
    waterwayLayer?.source ?? Object.keys(sources).find((id) => sources[id]?.type === 'vector') ?? null

  // On reprend une police que le serveur du plan fournit à coup sûr : celle
  // des libellés de cours d'eau s'il y en a, sinon celle de n'importe quel libellé.
  const labelLayer =
    layers.find((layer) => layer.type === 'symbol' && layer['source-layer'] === 'waterway' && layer.layout?.['text-font']) ??
    layers.find((layer) => layer.type === 'symbol' && layer.layout?.['text-font'])

  return { sourceId, font: labelLayer?.layout?.['text-font'] ?? null }
}

/** Largeur d'un cours d'eau selon le zoom : les rivières sont plus larges que les ruisseaux. */
function waterwayWidth(scale: number): unknown[] {
  const river = ['match', ['get', 'class'], ['river', 'canal'], 1, 0.55]
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    8,
    ['*', scale, 1, river],
    13,
    ['*', scale, 2.2, river],
    17,
    ['*', scale, 4.5, river],
  ]
}

export function buildSatelliteStyle(base: BaseStyle, options: SatelliteStyleOptions): Record<string, unknown> {
  const { sourceId, font } = findWaterway(base)
  const vectorSource = sourceId ? base.sources?.[sourceId] : undefined
  // Sans police, pas de libellé possible ; sans source, pas de cours d'eau : la vue reste utilisable.
  const canLabel = Boolean(vectorSource && font && base.glyphs)

  const layers: Record<string, unknown>[] = [{ id: 'satellite', type: 'raster', source: 'satellite' }]

  if (vectorSource && sourceId) {
    layers.push(
      {
        // Liseré sombre : le tracé reste lisible sur une eau claire comme sur un sous-bois.
        id: 'sat-waterway-edge',
        type: 'line',
        source: sourceId,
        'source-layer': 'waterway',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': DARK_EDGE, 'line-opacity': 0.55, 'line-width': waterwayWidth(1.9) },
      },
      {
        id: 'sat-waterway',
        type: 'line',
        source: sourceId,
        'source-layer': 'waterway',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': RIVER_BLUE, 'line-opacity': 0.9, 'line-width': waterwayWidth(1) },
      },
    )
  }

  if (canLabel && sourceId) {
    const name = ['coalesce', ['get', 'name:fr'], ['get', 'name']]
    layers.push(
      {
        id: 'sat-waterway-name',
        type: 'symbol',
        source: sourceId,
        'source-layer': 'waterway',
        minzoom: 11,
        filter: ['has', 'name'],
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 320,
          'text-field': name,
          'text-font': font,
          'text-size': 13,
          'text-letter-spacing': 0.08,
        },
        paint: { 'text-color': LABEL_LIGHT, 'text-halo-color': DARK_EDGE, 'text-halo-width': 1.6 },
      },
      {
        // Noms des communes, pour se repérer sur l'image.
        id: 'sat-place-name',
        type: 'symbol',
        source: sourceId,
        'source-layer': 'place',
        minzoom: 8,
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'hamlet']]],
        layout: {
          'text-field': name,
          'text-font': font,
          'text-size': ['match', ['get', 'class'], 'city', 16, 'town', 14, 12],
          'text-max-width': 8,
        },
        paint: { 'text-color': '#ffffff', 'text-halo-color': 'rgba(11, 37, 69, 0.85)', 'text-halo-width': 1.4 },
      },
    )
  }

  return {
    version: 8,
    ...(canLabel ? { glyphs: base.glyphs } : {}),
    sources: {
      satellite: {
        type: 'raster',
        tiles: [options.tilesUrl],
        tileSize: 256,
        maxzoom: options.maxZoom ?? 19,
        attribution: options.attribution,
      },
      ...(vectorSource && sourceId ? { [sourceId]: vectorSource } : {}),
    },
    layers,
  }
}
