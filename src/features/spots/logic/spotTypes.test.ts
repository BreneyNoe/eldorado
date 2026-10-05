import { describe, expect, it } from 'vitest'
import { allTypeIds, extraTypesOf, typesLabel } from '@/features/spots/logic/spotTypes'
import { makeSpotType } from '@/test/renderWithProviders'

const peche = makeSpotType('peche')
const urbex = makeSpotType('urbex')
const typesById = new Map([peche, urbex].map((type) => [type.id, type]))

describe('allTypeIds', () => {
  it('met le type principal en premier, sans doublon', () => {
    expect(allTypeIds('a', ['b', 'c'])).toEqual(['a', 'b', 'c'])
    expect(allTypeIds('a', ['a', 'b', 'b'])).toEqual(['a', 'b'])
  })

  it('tolère une liste absente (donnée gardée par une ancienne version)', () => {
    expect(allTypeIds('a', undefined)).toEqual(['a'])
    expect(allTypeIds(null, null)).toEqual([])
  })
})

describe('extraTypesOf', () => {
  it('retrouve les types connus et ignore les autres', () => {
    expect(extraTypesOf(['type-urbex', 'type-supprime'], typesById)).toEqual([urbex])
    expect(extraTypesOf(undefined, typesById)).toEqual([])
  })
})

describe('typesLabel', () => {
  it('assemble le type principal et les supplémentaires', () => {
    expect(typesLabel(peche)).toBe('Peche')
    expect(typesLabel(peche, [urbex])).toBe('Peche + Urbex')
    expect(typesLabel(undefined, [urbex])).toBe('Type inconnu + Urbex')
  })
})
