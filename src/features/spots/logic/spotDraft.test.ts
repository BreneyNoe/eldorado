import { describe, expect, it } from 'vitest'
import {
  addressSourceOf,
  cleanRatings,
  effectiveAddress,
  emptyDraft,
  roundCoordinate,
  todayIso,
  validateSpotDraft,
  type SpotDraft,
} from '@/features/spots/logic/spotDraft'

const now = new Date(2026, 9, 4, 15, 30) // 4 octobre 2026, heure locale

function validDraft(overrides: Partial<SpotDraft> = {}): SpotDraft {
  return {
    ...emptyDraft(now),
    lat: 44.8,
    lng: 4.25,
    spotTypeId: 'type-nature',
    name: 'Cascade du Ray-Pic',
    ...overrides,
  }
}

describe('todayIso', () => {
  it('donne la date locale au format AAAA-MM-JJ', () => {
    expect(todayIso(now)).toBe('2026-10-04')
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('emptyDraft', () => {
  it('propose la date du jour comme date de visite', () => {
    expect(emptyDraft(now).visitedOn).toBe('2026-10-04')
  })
})

describe('validateSpotDraft', () => {
  it('accepte un brouillon complet', () => {
    expect(validateSpotDraft(validDraft(), now)).toEqual({})
  })

  it('accepte un brouillon sans description, sans adresse, sans date ni notes', () => {
    expect(validateSpotDraft(validDraft({ visitedOn: '' }), now)).toEqual({})
  })

  it('exige une position', () => {
    expect(validateSpotDraft(validDraft({ lat: null }), now).position).toBeDefined()
    expect(validateSpotDraft(validDraft({ lat: 120 }), now).position).toBeDefined()
  })

  it('exige une sous-catégorie quand le type en propose', () => {
    expect(validateSpotDraft(validDraft(), now, { subtypeRequired: true }).subtypeId).toBe('Choisis une sous-catégorie.')
    expect(validateSpotDraft(validDraft({ subtypeId: 'sub-rails' }), now, { subtypeRequired: true })).toEqual({})
    expect(validateSpotDraft(validDraft(), now).subtypeId).toBeUndefined()
  })

  it('exige un type', () => {
    expect(validateSpotDraft(validDraft({ spotTypeId: null }), now).spotTypeId).toBe('Choisis un type de spot.')
  })

  it('applique les limites du nom, espaces exclus', () => {
    expect(validateSpotDraft(validDraft({ name: ' a ' }), now).name).toContain('au moins 2')
    expect(validateSpotDraft(validDraft({ name: 'ab' }), now).name).toBeUndefined()
    expect(validateSpotDraft(validDraft({ name: 'a'.repeat(81) }), now).name).toContain('80')
  })

  it('limite la description et l\'adresse', () => {
    expect(validateSpotDraft(validDraft({ description: 'a'.repeat(2001) }), now).description).toBeDefined()
    expect(validateSpotDraft(validDraft({ address: 'a'.repeat(301) }), now).address).toBeDefined()
  })

  it('refuse une date de visite future ou mal formée', () => {
    expect(validateSpotDraft(validDraft({ visitedOn: '2026-10-05' }), now).visitedOn).toContain('futur')
    expect(validateSpotDraft(validDraft({ visitedOn: '2026-10-04' }), now).visitedOn).toBeUndefined()
    expect(validateSpotDraft(validDraft({ visitedOn: '04/10/2026' }), now).visitedOn).toBe('Cette date est invalide.')
  })
})

describe('cleanRatings', () => {
  it('ne garde que les notes de 0,5 à 5, par demi-étoile', () => {
    expect(cleanRatings({ a: 5, b: 0, c: 6, d: 2.5, e: 1, f: Number.NaN, g: 0.5, h: 3.2, i: 5.5 })).toEqual({
      a: 5,
      d: 2.5,
      e: 1,
      g: 0.5,
    })
  })
})

describe('addressSourceOf', () => {
  it('"auto" quand l\'adresse proposée est conservée', () => {
    expect(addressSourceOf(' D 215, Péreyres ', 'D 215, Péreyres')).toBe('auto')
  })

  it('"manual" quand l\'adresse a été corrigée ou saisie', () => {
    expect(addressSourceOf('Parking du haut', 'D 215, Péreyres')).toBe('manual')
    expect(addressSourceOf('Parking du haut', null)).toBe('manual')
  })

  it('"auto" quand il n\'y a pas d\'adresse', () => {
    expect(addressSourceOf('  ', 'D 215')).toBe('auto')
  })
})

describe('effectiveAddress', () => {
  it('montre la proposition tant que l\'utilisateur n\'a rien modifié', () => {
    expect(effectiveAddress({ address: '', addressEdited: false }, 'D 215, Péreyres')).toBe('D 215, Péreyres')
    expect(effectiveAddress({ address: '', addressEdited: false }, null)).toBe('')
  })

  it('garde la saisie de l\'utilisateur, même vide, une fois qu\'il a pris la main', () => {
    expect(effectiveAddress({ address: 'Parking du haut', addressEdited: true }, 'D 215')).toBe('Parking du haut')
    expect(effectiveAddress({ address: '', addressEdited: true }, 'D 215')).toBe('')
  })
})

describe('roundCoordinate', () => {
  it('arrondit à 6 décimales', () => {
    expect(roundCoordinate(44.80091234567)).toBe(44.800912)
  })
})
