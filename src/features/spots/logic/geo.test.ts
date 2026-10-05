import { describe, expect, it } from 'vitest'
import { distanceMeters, formatDistance, sortSpots, spotsInBounds } from '@/features/spots/logic/geo'
import type { SpotLight } from '@/types/models'

function makeSpot(id: string, overrides: Partial<SpotLight> = {}): SpotLight {
  return {
    id,
    spot_type_id: 'nature',
    name: `Spot ${id}`,
    lat: 44.8,
    lng: 4.25,
    address: null,
    created_by: null,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    cover_thumb_path: null,
    subtype_id: null,
    extra_type_ids: [],
    ...overrides,
  }
}

describe('distanceMeters', () => {
  it('vaut zéro entre un point et lui-même', () => {
    expect(distanceMeters({ lat: 44.8, lng: 4.25 }, { lat: 44.8, lng: 4.25 })).toBe(0)
  })

  it('donne environ 111 km pour un degré de latitude', () => {
    const distance = distanceMeters({ lat: 44, lng: 4 }, { lat: 45, lng: 4 })
    expect(distance).toBeGreaterThan(110_000)
    expect(distance).toBeLessThan(112_500)
  })

  it('donne environ 392 km entre Paris et Lyon', () => {
    const distance = distanceMeters({ lat: 48.8566, lng: 2.3522 }, { lat: 45.764, lng: 4.8357 })
    expect(Math.round(distance / 1000)).toBeGreaterThanOrEqual(390)
    expect(Math.round(distance / 1000)).toBeLessThanOrEqual(394)
  })
})

describe('formatDistance', () => {
  it('arrondit à la dizaine de mètres sous 1 km', () => {
    expect(formatDistance(4)).toBe('0 m')
    expect(formatDistance(347)).toBe('350 m')
    expect(formatDistance(994)).toBe('990 m')
  })

  it('utilise la virgule française entre 1 et 10 km', () => {
    expect(formatDistance(1000)).toBe('1,0 km')
    expect(formatDistance(1249)).toBe('1,2 km')
  })

  it('arrondit au kilomètre au-delà de 10 km', () => {
    expect(formatDistance(48_400)).toBe('48 km')
  })
})

describe('spotsInBounds', () => {
  const spots = [
    makeSpot('dedans', { lat: 44.8, lng: 4.25 }),
    makeSpot('au-nord', { lat: 46, lng: 4.25 }),
    makeSpot('a-l-est', { lat: 44.8, lng: 6 }),
    makeSpot('sur-le-bord', { lat: 45, lng: 5 }),
  ]

  it('garde les spots du rectangle, bords compris', () => {
    const result = spotsInBounds(spots, [
      [4, 44],
      [5, 45],
    ])
    expect(result.map((spot) => spot.id)).toEqual(['dedans', 'sur-le-bord'])
  })

  it('gère un rectangle à cheval sur l\'antiméridien', () => {
    const pacific = [makeSpot('fidji', { lat: -17, lng: 178 }), makeSpot('samoa', { lat: -14, lng: -172 }), makeSpot('paris', { lat: 48, lng: 2 })]
    const result = spotsInBounds(pacific, [
      [170, -30],
      [-160, 0],
    ])
    expect(result.map((spot) => spot.id)).toEqual(['fidji', 'samoa'])
  })
})

describe('sortSpots', () => {
  const spots = [
    makeSpot('b', { name: 'étang', created_at: '2026-09-01T10:00:00Z', lat: 44.9 }),
    makeSpot('a', { name: 'Cascade 10', created_at: '2026-10-03T10:00:00Z', lat: 46 }),
    makeSpot('c', { name: 'Cascade 2', created_at: '2026-08-01T10:00:00Z', lat: 44.81 }),
  ]

  it('ne modifie pas le tableau reçu', () => {
    const before = spots.map((spot) => spot.id)
    sortSpots(spots, 'name')
    expect(spots.map((spot) => spot.id)).toEqual(before)
  })

  it('"recent" : du plus récent au plus ancien', () => {
    expect(sortSpots(spots, 'recent').map((spot) => spot.id)).toEqual(['a', 'b', 'c'])
  })

  it('"name" : ordre alphabétique français, accents ignorés, nombres dans l\'ordre naturel', () => {
    expect(sortSpots(spots, 'name').map((spot) => spot.name)).toEqual(['Cascade 2', 'Cascade 10', 'étang'])
  })

  it('"distance" : du plus proche au plus lointain', () => {
    expect(sortSpots(spots, 'distance', { lat: 44.8, lng: 4.25 }).map((spot) => spot.id)).toEqual(['c', 'b', 'a'])
  })

  it('"distance" sans point de référence : repli sur le plus récent', () => {
    expect(sortSpots(spots, 'distance', null).map((spot) => spot.id)).toEqual(['a', 'b', 'c'])
  })
})
