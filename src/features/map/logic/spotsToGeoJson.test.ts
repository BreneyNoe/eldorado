import { describe, expect, it } from 'vitest'
import {
  clusterImageId,
  parseImageId,
  pinImageId,
  spotsToGeoJson,
} from '@/features/map/logic/spotsToGeoJson'
import type { SpotLight } from '@/types/models'

function makeSpot(overrides: Partial<SpotLight> = {}): SpotLight {
  return {
    id: 'spot-1',
    spot_type_id: 'type-nature',
    name: 'Cascade',
    lat: 44.8,
    lng: 4.25,
    address: null,
    created_by: null,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    cover_thumb_path: null,
    subtype_id: null,
    ...overrides,
  }
}

const knownTypes = new Set(['type-nature', 'type-urbex'])

describe('spotsToGeoJson', () => {
  it('place la longitude avant la latitude, comme l\'exige GeoJSON', () => {
    const { features } = spotsToGeoJson([makeSpot()], knownTypes)
    expect(features[0].geometry.coordinates).toEqual([4.25, 44.8])
  })

  it('associe à chaque spot les images de son type', () => {
    const { features } = spotsToGeoJson([makeSpot({ spot_type_id: 'type-urbex' })], knownTypes)
    expect(features[0].properties).toEqual({
      spotId: 'spot-1',
      pin: 'pin/type-urbex',
      pinSelected: 'pin-selected/type-urbex',
    })
  })

  it('donne le marqueur neutre à un type inconnu', () => {
    const { features } = spotsToGeoJson([makeSpot({ spot_type_id: 'type-supprime' })], knownTypes)
    expect(features[0].properties.pin).toBe('pin/unknown')
  })

  it('utilise le marqueur de la sous-catégorie quand il existe', () => {
    const styles = new Set(['type-ride', 'type-ride~sub-rails'])
    const { features } = spotsToGeoJson(
      [
        makeSpot({ id: 'a', spot_type_id: 'type-ride', subtype_id: 'sub-rails' }),
        makeSpot({ id: 'b', spot_type_id: 'type-ride', subtype_id: 'sub-inconnue' }),
        makeSpot({ id: 'c', spot_type_id: 'type-ride' }),
      ],
      styles,
    )
    expect(features.map((feature) => feature.properties.pin)).toEqual([
      'pin/type-ride~sub-rails',
      'pin/type-ride',
      'pin/type-ride',
    ])
  })

  it('écarte les spots aux coordonnées invalides', () => {
    const collection = spotsToGeoJson(
      [makeSpot({ id: 'a' }), makeSpot({ id: 'b', lat: Number.NaN }), makeSpot({ id: 'c', lng: 500 })],
      knownTypes,
    )
    expect(collection.features.map((feature) => feature.properties.spotId)).toEqual(['a'])
  })

  it('renvoie une collection vide valide', () => {
    expect(spotsToGeoJson([], knownTypes)).toEqual({ type: 'FeatureCollection', features: [] })
  })
})

describe('noms des images', () => {
  it('fait l\'aller-retour pour un marqueur', () => {
    expect(parseImageId(pinImageId('abc', false))).toEqual({ kind: 'pin', typeId: 'abc', selected: false })
    expect(parseImageId(pinImageId('abc', true))).toEqual({ kind: 'pin', typeId: 'abc', selected: true })
  })

  it('fait l\'aller-retour pour un regroupement', () => {
    expect(parseImageId(clusterImageId('1.2k'))).toEqual({ kind: 'cluster', label: '1.2k' })
  })

  it('ignore les images qui ne sont pas les nôtres', () => {
    for (const id of ['', 'pin', 'pin/', 'autre/abc', 'restaurant_11', '/abc']) {
      expect(parseImageId(id)).toBeNull()
    }
  })
})
