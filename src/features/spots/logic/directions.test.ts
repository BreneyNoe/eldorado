import { describe, expect, it } from 'vitest'
import { directionsUrl } from '@/features/spots/logic/directions'

describe('directionsUrl', () => {
  it('pointe vers un itinéraire Google Maps jusqu\'aux coordonnées', () => {
    expect(directionsUrl(44.8009, 4.253)).toBe('https://www.google.com/maps/dir/?api=1&destination=44.8009,4.253')
  })

  it('gère les coordonnées négatives', () => {
    expect(directionsUrl(-33.8568, -70.6483)).toBe('https://www.google.com/maps/dir/?api=1&destination=-33.8568,-70.6483')
  })
})
