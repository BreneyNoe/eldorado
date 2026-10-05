import { describe, expect, it } from 'vitest'
import {
  applyFilters,
  EMPTY_FILTERS,
  hasActiveFilters,
  matchesSearch,
  normalizeText,
  toggleType,
  hasAnyType,
} from '@/features/spots/logic/filters'
import type { SpotLight } from '@/types/models'

function makeSpot(id: string, name: string, typeId: string): SpotLight {
  return {
    id,
    spot_type_id: typeId,
    name,
    lat: 44.8,
    lng: 4.25,
    address: null,
    created_by: null,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    cover_thumb_path: null,
    subtype_id: null,
    extra_type_ids: [],
  }
}

const spots = [
  makeSpot('1', 'Cascade du Ray-Pic', 'nature'),
  makeSpot('2', 'Étang des Sources', 'peche'),
  makeSpot('3', 'Pont du Diable', 'baignade'),
  makeSpot('4', 'Ancienne filature', 'urbex'),
  makeSpot('5', 'Cascade de la Beaume', 'baignade'),
]

describe('normalizeText', () => {
  it('retire accents, majuscules et espaces superflus', () => {
    expect(normalizeText('  Étang   BLEU  ')).toBe('etang bleu')
    expect(normalizeText('Calanque d\u2019En-Vau')).toBe('calanque d\u2019en-vau')
  })
})

describe('matchesSearch', () => {
  it('ignore les accents et la casse, dans les deux sens', () => {
    expect(matchesSearch('Étang des Sources', 'etang')).toBe(true)
    expect(matchesSearch('Etang des Sources', 'ÉTANG')).toBe(true)
  })

  it('trouve un morceau de mot', () => {
    expect(matchesSearch('Cascade du Ray-Pic', 'casc')).toBe(true)
    expect(matchesSearch('Cascade du Ray-Pic', 'pic')).toBe(true)
  })

  it('exige tous les mots, dans n\'importe quel ordre', () => {
    expect(matchesSearch('Cascade du Ray-Pic', 'ray cascade')).toBe(true)
    expect(matchesSearch('Cascade du Ray-Pic', 'cascade beaume')).toBe(false)
  })

  it('une recherche vide accepte tout', () => {
    expect(matchesSearch('Peu importe', '   ')).toBe(true)
  })
})

describe('applyFilters', () => {
  it('sans filtre, renvoie la liste telle quelle (même tableau)', () => {
    expect(applyFilters(spots, EMPTY_FILTERS)).toBe(spots)
  })

  it('filtre sur un seul type', () => {
    expect(applyFilters(spots, { typeIds: ['baignade'], search: '' }).map((spot) => spot.id)).toEqual(['3', '5'])
  })

  it('filtre sur plusieurs types', () => {
    expect(applyFilters(spots, { typeIds: ['nature', 'urbex'], search: '' }).map((spot) => spot.id)).toEqual(['1', '4'])
  })

  it('filtre sur le nom', () => {
    expect(applyFilters(spots, { typeIds: [], search: 'cascade' }).map((spot) => spot.id)).toEqual(['1', '5'])
  })

  it('combine type et recherche', () => {
    expect(applyFilters(spots, { typeIds: ['baignade'], search: 'cascade' }).map((spot) => spot.id)).toEqual(['5'])
  })

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(applyFilters(spots, { typeIds: ['peche'], search: 'cascade' })).toEqual([])
  })
})

describe('hasActiveFilters', () => {
  it('détecte un type ou un texte', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(hasActiveFilters({ typeIds: [], search: '   ' })).toBe(false)
    expect(hasActiveFilters({ typeIds: ['nature'], search: '' })).toBe(true)
    expect(hasActiveFilters({ typeIds: [], search: 'a' })).toBe(true)
  })
})

describe('toggleType', () => {
  const all = ['nature', 'peche', 'baignade', 'urbex']

  it('coche un type', () => {
    expect(toggleType([], 'nature', all)).toEqual(['nature'])
    expect(toggleType(['nature'], 'baignade', all)).toEqual(['nature', 'baignade'])
  })

  it('décoche un type', () => {
    expect(toggleType(['nature', 'baignade'], 'nature', all)).toEqual(['baignade'])
    expect(toggleType(['nature'], 'nature', all)).toEqual([])
  })

  it('revient à "tous" quand tous les types sont cochés', () => {
    expect(toggleType(['nature', 'peche', 'baignade'], 'urbex', all)).toEqual([])
  })
})

describe('hasAnyType', () => {
  const both = { spot_type_id: 'type-peche', extra_type_ids: ['type-urbex'] }

  it('répond au type principal comme aux types supplémentaires', () => {
    expect(hasAnyType(both, new Set(['type-peche']))).toBe(true)
    expect(hasAnyType(both, new Set(['type-urbex']))).toBe(true)
    expect(hasAnyType(both, new Set(['type-nature']))).toBe(false)
  })

  it('tolère une donnée ancienne, sans liste de types supplémentaires', () => {
    const old = { spot_type_id: 'type-peche' } as unknown as typeof both
    expect(hasAnyType(old, new Set(['type-peche']))).toBe(true)
    expect(hasAnyType(old, new Set(['type-urbex']))).toBe(false)
  })
})
