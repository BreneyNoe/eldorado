import { describe, expect, it } from 'vitest'
import { buildSatelliteStyle, type BaseStyle } from '@/features/map/logic/satelliteStyle'

const options = { tilesUrl: 'https://images.example/{z}/{x}/{y}.jpg', attribution: '© Fournisseur' }

/** Style réduit, de la même forme que celui du plan (schéma OpenMapTiles). */
const planStyle: BaseStyle = {
  glyphs: 'https://tiles.example/fonts/{fontstack}/{range}.pbf',
  sources: {
    'ne2_shaded': { type: 'raster', tiles: ['https://tiles.example/ne/{z}/{x}/{y}.png'] },
    openmaptiles: { type: 'vector', url: 'https://tiles.example/planet' },
  },
  layers: [
    { type: 'background' },
    { type: 'line', source: 'openmaptiles', 'source-layer': 'waterway' },
    { type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', layout: { 'text-font': ['Noto Sans Regular'] } },
    { type: 'symbol', source: 'openmaptiles', 'source-layer': 'waterway', layout: { 'text-font': ['Noto Sans Italic'] } },
  ],
}

function layerIds(style: Record<string, unknown>) {
  return (style.layers as { id: string }[]).map((layer) => layer.id)
}

describe('buildSatelliteStyle', () => {
  it('pose les images en fond, puis les cours d\'eau et les noms par-dessus', () => {
    const style = buildSatelliteStyle(planStyle, options)
    expect(layerIds(style)).toEqual(['satellite', 'sat-waterway-edge', 'sat-waterway', 'sat-waterway-name', 'sat-place-name'])
  })

  it('déclare la source d\'images avec son adresse et sa mention légale', () => {
    const style = buildSatelliteStyle(planStyle, options)
    const sources = style.sources as Record<string, Record<string, unknown>>
    expect(sources.satellite).toMatchObject({ type: 'raster', tiles: [options.tilesUrl], tileSize: 256, attribution: '© Fournisseur' })
  })

  it('reprend la source de données et les polices du plan, sans rien d\'autre', () => {
    const style = buildSatelliteStyle(planStyle, options)
    const sources = style.sources as Record<string, unknown>
    expect(Object.keys(sources).sort()).toEqual(['openmaptiles', 'satellite'])
    expect(sources.openmaptiles).toBe(planStyle.sources?.openmaptiles)
    expect(style.glyphs).toBe(planStyle.glyphs)
  })

  it('dessine les cours d\'eau à partir de la couche "waterway"', () => {
    const style = buildSatelliteStyle(planStyle, options)
    const river = (style.layers as Record<string, unknown>[]).find((layer) => layer.id === 'sat-waterway')
    expect(river).toMatchObject({ type: 'line', source: 'openmaptiles', 'source-layer': 'waterway' })
  })

  it('écrit les noms de cours d\'eau avec la police que le plan utilise pour eux', () => {
    const style = buildSatelliteStyle(planStyle, options)
    const label = (style.layers as { id: string; layout?: Record<string, unknown> }[]).find((layer) => layer.id === 'sat-waterway-name')
    expect(label?.layout?.['text-font']).toEqual(['Noto Sans Italic'])
  })

  it('se passe de libellés si le plan ne fournit pas de police', () => {
    const style = buildSatelliteStyle({ ...planStyle, glyphs: undefined }, options)
    expect(layerIds(style)).toEqual(['satellite', 'sat-waterway-edge', 'sat-waterway'])
    expect(style.glyphs).toBeUndefined()
  })

  it('reste utilisable si le plan n\'a aucune donnée vectorielle : images seules', () => {
    const style = buildSatelliteStyle({ sources: {}, layers: [{ type: 'background' }] }, options)
    expect(layerIds(style)).toEqual(['satellite'])
    expect(Object.keys(style.sources as object)).toEqual(['satellite'])
  })

  it('retrouve la source vectorielle même sans couche de cours d\'eau dans le plan', () => {
    const style = buildSatelliteStyle(
      { ...planStyle, layers: [{ type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', layout: { 'text-font': ['Noto Sans Regular'] } }] },
      options,
    )
    expect(layerIds(style)).toContain('sat-waterway')
  })
})
