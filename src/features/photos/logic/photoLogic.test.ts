import { describe, expect, it } from 'vitest'
import { earliestDate, parseExifDate, toIsoDay } from '@/features/photos/logic/exifDate'
import { fitWithin } from '@/features/photos/logic/imageSize'
import { photoPaths } from '@/features/photos/logic/photoPaths'
import { proposePosition } from '@/features/photos/logic/proposePosition'

describe('fitWithin', () => {
  it('réduit une photo paysage sur son grand côté', () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('réduit une photo portrait sur son grand côté', () => {
    expect(fitWithin(3024, 4032, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it("n'agrandit jamais une image déjà petite", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('garde au moins un pixel pour une image très allongée', () => {
    expect(fitWithin(10000, 2, 400)).toEqual({ width: 400, height: 1 })
  })

  it('gère une taille nulle', () => {
    expect(fitWithin(0, 0, 400)).toEqual({ width: 0, height: 0 })
  })
})

describe('photoPaths', () => {
  it('suit la forme imposée par la base', () => {
    expect(photoPaths('spot-1', 'photo-9')).toEqual({
      standard: 'spots/spot-1/photo-9_std.jpg',
      thumb: 'spots/spot-1/photo-9_thumb.jpg',
    })
  })
})

describe('parseExifDate', () => {
  it('lit une date EXIF comme une heure locale', () => {
    const date = parseExifDate('2026:09:10 14:30:00')
    expect(date).not.toBeNull()
    expect([date!.getFullYear(), date!.getMonth(), date!.getDate(), date!.getHours(), date!.getMinutes()]).toEqual([
      2026, 8, 10, 14, 30,
    ])
  })

  it('accepte aussi la forme avec tirets', () => {
    expect(toIsoDay(parseExifDate('2026-09-10T08:00:00')!)).toBe('2026-09-10')
  })

  it('refuse ce qui est absent, vide ou invalide', () => {
    for (const text of [null, undefined, '', '0000:00:00 00:00:00', 'hier', '2026:13:01 10:00:00', '2026:02:31 10:00:00']) {
      expect(parseExifDate(text)).toBeNull()
    }
  })
})

describe('earliestDate', () => {
  it('renvoie la plus ancienne en ignorant les absentes', () => {
    const a = new Date(2026, 8, 10)
    const b = new Date(2026, 7, 2)
    expect(earliestDate([a, null, b])).toBe(b)
    expect(earliestDate([null, null])).toBeNull()
    expect(earliestDate([])).toBeNull()
  })
})

describe('proposePosition', () => {
  const rayPic = { lat: 44.8009, lng: 4.253 }
  const rayPicNear = { lat: 44.8012, lng: 4.2533 } // à une quarantaine de mètres
  const verdon = { lat: 43.769, lng: 6.192 }

  it('aucune photo localisée : aucune proposition', () => {
    expect(proposePosition([])).toBeNull()
    expect(proposePosition([null, null])).toBeNull()
  })

  it('une seule photo : sa position', () => {
    const proposal = proposePosition([rayPic])!
    expect(proposal.position).toEqual(rayPic)
    expect(proposal.explanation).toBe('Position lue dans la photo.')
  })

  it('plusieurs photos du même lieu : leur point moyen', () => {
    const proposal = proposePosition([rayPic, rayPicNear])!
    expect(proposal.position.lat).toBeCloseTo(44.80105, 5)
    expect(proposal.position.lng).toBeCloseTo(4.25315, 5)
    expect(proposal.usedCount).toBe(2)
    expect(proposal.explanation).toBe('Position moyenne des 2 photos.')
  })

  it('des photos sans localisation sont ignorées et signalées', () => {
    const proposal = proposePosition([null, rayPic, null])!
    expect(proposal.position).toEqual(rayPic)
    expect(proposal).toMatchObject({ usedCount: 1, locatedCount: 1, totalCount: 3 })
    expect(proposal.explanation).toBe('Position lue dans 1 photo sur 3.')
  })

  it('plusieurs lieux : le groupe le plus nombreux l\'emporte', () => {
    const proposal = proposePosition([verdon, rayPic, rayPicNear])!
    expect(proposal.position.lat).toBeCloseTo(44.80105, 5)
    expect(proposal.usedCount).toBe(2)
    expect(proposal.explanation).toBe(
      "Les photos viennent de 2 lieux différents : position proposée d'après 2 photos sur 3.",
    )
  })

  it('plusieurs lieux à égalité : celui de la première photo choisie', () => {
    const proposal = proposePosition([verdon, rayPic])!
    expect(proposal.position).toEqual(verdon)
    expect(proposal.explanation).toBe(
      "Les photos viennent de 2 lieux différents : position proposée d'après 1 photo sur 2.",
    )
  })

  it('le rayon de regroupement est réglable', () => {
    expect(proposePosition([rayPic, rayPicNear], 10)!.usedCount).toBe(1)
    expect(proposePosition([rayPic, rayPicNear], 500)!.usedCount).toBe(2)
  })
})
