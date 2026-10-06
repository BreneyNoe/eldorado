import { describe, expect, it } from 'vitest'
import { allTypeIds, extraTypesOf, isSubtypeRequired, subtypeFullLabel, typesLabel } from '@/features/spots/logic/spotTypes'
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

describe('isSubtypeRequired', () => {
  const types = [
    { id: 'nature', subtype_optional: true },
    { id: 'ride', subtype_optional: false },
    { id: 'peche', subtype_optional: false },
  ]
  const subtypes = [
    { spot_type_id: 'nature', is_active: true },
    { spot_type_id: 'ride', is_active: true },
  ]

  it('Ride impose une sous-catégorie, Nature la laisse au choix', () => {
    expect(isSubtypeRequired(['ride'], types, subtypes)).toBe(true)
    expect(isSubtypeRequired(['nature'], types, subtypes)).toBe(false)
  })

  it('un type sans sous-catégorie n\'impose rien', () => {
    expect(isSubtypeRequired(['peche'], types, subtypes)).toBe(false)
    expect(isSubtypeRequired([], types, subtypes)).toBe(false)
  })

  it('plusieurs types : obligatoire dès que l\'un d\'eux l\'impose', () => {
    expect(isSubtypeRequired(['nature', 'ride'], types, subtypes)).toBe(true)
    expect(isSubtypeRequired(['nature', 'peche'], types, subtypes)).toBe(false)
  })

  it('ignore les sous-catégories désactivées et les types inconnus', () => {
    expect(isSubtypeRequired(['ride'], types, [{ spot_type_id: 'ride', is_active: false }])).toBe(false)
    expect(isSubtypeRequired(['supprime'], types, [{ spot_type_id: 'supprime', is_active: true }])).toBe(false)
  })
})

describe('subtypeFullLabel', () => {
  const all = [
    { id: 'bivouac', label: 'Bivouac' },
    { id: 'tente', label: 'Tente' },
  ]

  it('une précision porte le nom de sa sous-catégorie', () => {
    expect(subtypeFullLabel({ label: 'Tente', parent_id: 'bivouac' }, all)).toBe('Bivouac · Tente')
  })

  it('une sous-catégorie simple garde son nom', () => {
    expect(subtypeFullLabel({ label: 'Bivouac', parent_id: null }, all)).toBe('Bivouac')
    expect(subtypeFullLabel({ label: 'Tente', parent_id: 'inconnue' }, all)).toBe('Tente')
  })
})
