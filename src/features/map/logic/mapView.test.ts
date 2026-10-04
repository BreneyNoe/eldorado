import { describe, expect, it } from 'vitest'
import {
  boundsOfPoints,
  isValidCoordinate,
  parseSavedView,
  serializeView,
} from '@/features/map/logic/mapView'

describe('parseSavedView', () => {
  it('relit une vue enregistrée', () => {
    expect(parseSavedView('{"lng":4.25,"lat":44.8,"zoom":12}')).toEqual({ lng: 4.25, lat: 44.8, zoom: 12 })
  })

  it('fait l\'aller-retour avec serializeView', () => {
    const view = { lng: 4.2531234, lat: 44.8009876, zoom: 12.3456 }
    expect(parseSavedView(serializeView(view))).toEqual({ lng: 4.25312, lat: 44.80099, zoom: 12.35 })
  })

  it('refuse ce qui est absent, abîmé ou hors limites', () => {
    for (const raw of [
      null,
      undefined,
      '',
      'pas du json',
      'null',
      '42',
      '{"lng":4.25,"lat":44.8}',
      '{"lng":"4.25","lat":44.8,"zoom":12}',
      '{"lng":4.25,"lat":95,"zoom":12}',
      '{"lng":200,"lat":44.8,"zoom":12}',
      '{"lng":4.25,"lat":44.8,"zoom":99}',
      '{"lng":4.25,"lat":44.8,"zoom":-1}',
    ]) {
      expect(parseSavedView(raw)).toBeNull()
    }
  })
})

describe('isValidCoordinate', () => {
  it('accepte les limites et refuse le reste', () => {
    expect(isValidCoordinate(90, 180)).toBe(true)
    expect(isValidCoordinate(-90, -180)).toBe(true)
    expect(isValidCoordinate(90.1, 0)).toBe(false)
    expect(isValidCoordinate(0, Number.NaN)).toBe(false)
    expect(isValidCoordinate('44', 4)).toBe(false)
  })
})

describe('boundsOfPoints', () => {
  it('renvoie null sans point', () => {
    expect(boundsOfPoints([])).toBeNull()
  })

  it('encadre un point unique', () => {
    expect(boundsOfPoints([{ lat: 44.8, lng: 4.25 }])).toEqual([
      [4.25, 44.8],
      [4.25, 44.8],
    ])
  })

  it('encadre plusieurs points', () => {
    expect(
      boundsOfPoints([
        { lat: 44.8, lng: 4.25 },
        { lat: 43.1, lng: 6.9 },
        { lat: 48.5, lng: -3.2 },
      ]),
    ).toEqual([
      [-3.2, 43.1],
      [6.9, 48.5],
    ])
  })

  it('ignore les points invalides', () => {
    expect(
      boundsOfPoints([
        { lat: Number.NaN, lng: 4 },
        { lat: 44.8, lng: 4.25 },
        { lat: 120, lng: 4 },
      ]),
    ).toEqual([
      [4.25, 44.8],
      [4.25, 44.8],
    ])
  })
})
