import { describe, expect, it } from 'vitest'
import { parseLocation } from '@/features/spots/logic/parseLocation'

function position(input: string) {
  const result = parseLocation(input)
  return result.kind === 'coordinates' ? result.position : result.kind
}

describe('parseLocation : coordonnées copiées', () => {
  it('lit "latitude, longitude" comme les copie Google Maps', () => {
    expect(position('44.80090, 4.25300')).toEqual({ lat: 44.8009, lng: 4.253 })
    expect(position('  44.8009,4.253  ')).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('accepte un espace, un point-virgule ou des parenthèses', () => {
    expect(position('44.8009 4.253')).toEqual({ lat: 44.8009, lng: 4.253 })
    expect(position('44.8009; 4.253')).toEqual({ lat: 44.8009, lng: 4.253 })
    expect(position('(44.8009, 4.253)')).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('gère l\'hémisphère sud et l\'ouest', () => {
    expect(position('-33.8568, -70.6483')).toEqual({ lat: -33.8568, lng: -70.6483 })
  })

  it('lit les degrés, minutes, secondes', () => {
    const result = position('44°48\'03.2"N 4°15\'10.8"E') as { lat: number; lng: number }
    expect(result.lat).toBeCloseTo(44.80089, 4)
    expect(result.lng).toBeCloseTo(4.253, 4)
    const south = position('33°51\'24.5"S 70°38\'53.9"W') as { lat: number; lng: number }
    expect(south.lat).toBeCloseTo(-33.85681, 4)
    expect(south.lng).toBeCloseTo(-70.64831, 4)
  })

  it('lit un lien "geo:"', () => {
    expect(position('geo:44.8009,4.253?z=17')).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('refuse des valeurs hors limites ou le point (0, 0)', () => {
    expect(position('95.0, 4.25')).toBe('unknown')
    expect(position('44.8, 200')).toBe('unknown')
    expect(position('0, 0')).toBe('unknown')
  })

  it('refuse un texte quelconque', () => {
    expect(position('')).toBe('unknown')
    expect(position('Cascade du Ray-Pic')).toBe('unknown')
    expect(position('44.8009')).toBe('unknown')
  })
})

describe('parseLocation : liens Google Maps', () => {
  it('préfère l\'emplacement exact du lieu au centre de la vue', () => {
    const url =
      'https://www.google.com/maps/place/Cascade+du+Ray-Pic/@44.7950,4.2600,15z/data=!3m1!4b1!4m6!3m5!1s0x12b4:0x99!8m2!3d44.8009!4d4.253!16s%2Fg%2F1td'
    expect(position(url)).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('lit un point épinglé : ?q=lat,lng et ?query=lat,lng', () => {
    expect(position('https://www.google.com/maps?q=44.8009,4.253')).toEqual({ lat: 44.8009, lng: 4.253 })
    expect(position('https://www.google.com/maps/search/?api=1&query=44.8009%2C4.253')).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('lit des coordonnées dans le chemin', () => {
    expect(position('https://www.google.com/maps/place/44.8009,4.253/')).toEqual({ lat: 44.8009, lng: 4.253 })
    const dms = position('https://www.google.com/maps/place/44%C2%B048\'03.2%22N+4%C2%B015\'10.8%22E/') as { lat: number }
    expect(dms.lat).toBeCloseTo(44.80089, 4)
  })

  it('à défaut, prend le centre de la vue', () => {
    expect(position('https://www.google.com/maps/@44.8009,4.253,17z')).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('lit la destination d\'un itinéraire', () => {
    expect(position('https://www.google.com/maps/dir/?api=1&destination=44.8009,4.253')).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('traverse la page de consentement de Google', () => {
    const target = encodeURIComponent('https://www.google.com/maps/place/X/@44.79,4.26,15z/data=!3d44.8009!4d4.253')
    expect(position(`https://consent.google.com/m?continue=${target}&gl=FR`)).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('lit un lien précédé du nom du lieu', () => {
    expect(position('Cascade du Ray-Pic\nhttps://www.google.com/maps?q=44.8009,4.253')).toEqual({ lat: 44.8009, lng: 4.253 })
  })

  it('lit un lien Plans d\'Apple', () => {
    expect(position('https://maps.apple.com/?ll=44.8009,4.253&q=Rep%C3%A8re')).toEqual({ lat: 44.8009, lng: 4.253 })
  })
})

describe('parseLocation : liens sans position', () => {
  it('reconnaît un lien court, à résoudre côté serveur', () => {
    expect(parseLocation('https://maps.app.goo.gl/AbCdEfGh12345')).toEqual({
      kind: 'short_link',
      url: 'https://maps.app.goo.gl/AbCdEfGh12345',
    })
    expect(parseLocation('Mon favori https://maps.app.goo.gl/AbCd?g_st=ic').kind).toBe('short_link')
  })

  it('un lien de lieu sans coordonnées est inexploitable', () => {
    expect(position('https://www.google.com/maps/place/Tour+Eiffel/')).toBe('unknown')
    expect(position('https://example.com/page')).toBe('unknown')
  })
})
