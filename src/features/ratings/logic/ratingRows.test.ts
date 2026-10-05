import { describe, expect, it } from 'vitest'
import { buildRatingRows, formatAverage, formatVotes, ratingChanges } from '@/features/ratings/logic/ratingRows'
import type { RatingCategory } from '@/types/models'

function category(id: string, typeId: string, label: string, sortOrder: number, isActive = true): RatingCategory {
  return {
    id,
    spot_type_id: typeId,
    key: id,
    label,
    sort_order: sortOrder,
    is_active: isActive,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  }
}

const categories = [
  category('tranquillite', 'nature', 'Tranquillité', 30),
  category('beaute', 'nature', 'Beauté', 10),
  category('accessibilite', 'nature', 'Accessibilité', 20),
  category('retiree', 'nature', 'Retirée', 40, false),
  category('cliffjump', 'baignade', 'Cliffjump', 40),
]

describe('buildRatingRows', () => {
  it('donne les catégories actives du type, dans leur ordre', () => {
    const rows = buildRatingRows('nature', categories, [], [])
    expect(rows.map((row) => row.label)).toEqual(['Beauté', 'Accessibilité', 'Tranquillité'])
  })

  it('associe la moyenne, le nombre d\'avis et ma note', () => {
    const rows = buildRatingRows(
      'nature',
      categories,
      [{ category_id: 'beaute', average: 4.5, votes: 2 }],
      [{ category_id: 'beaute', value: 4 }],
    )
    expect(rows[0]).toEqual({ categoryId: 'beaute', label: 'Beauté', group: null, average: 4.5, votes: 2, mine: 4 })
  })

  it('une catégorie sans avis n\'a pas de moyenne', () => {
    const rows = buildRatingRows('nature', categories, [], [])
    expect(rows[1]).toMatchObject({ average: null, votes: 0, mine: null })
  })

  it('ignore les données d\'un autre type ou d\'une catégorie retirée', () => {
    const rows = buildRatingRows(
      'nature',
      categories,
      [
        { category_id: 'cliffjump', average: 5, votes: 1 },
        { category_id: 'retiree', average: 2, votes: 3 },
      ],
      [{ category_id: 'cliffjump', value: 5 }],
    )
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.votes === 0 && row.mine === null)).toBe(true)
  })

  it('accepte une moyenne reçue sous forme de texte', () => {
    // Selon le pilote, PostgreSQL peut renvoyer un nombre décimal sous forme de chaîne.
    const rows = buildRatingRows('nature', categories, [{ category_id: 'beaute', average: '3.5' as unknown as number, votes: 2 }], [])
    expect(rows[0].average).toBe(3.5)
  })

  it('spot à plusieurs types : catégories du principal d\'abord, puis des autres, avec leur groupe', () => {
    const rows = buildRatingRows(
      ['baignade', 'nature'],
      categories,
      [{ category_id: 'cliffjump', average: 4, votes: 1 }],
      [{ category_id: 'beaute', value: 3.5 }],
      new Map([['nature', 'Nature'], ['baignade', 'Baignade']]),
    )
    expect(rows.map((row) => [row.group, row.label])).toEqual([
      ['Baignade', 'Cliffjump'],
      ['Nature', 'Beauté'],
      ['Nature', 'Accessibilité'],
      ['Nature', 'Tranquillité'],
    ])
    expect(rows[0]).toMatchObject({ average: 4, votes: 1 })
    expect(rows[1].mine).toBe(3.5)
  })

  it('un seul type : pas de groupe, même donné sous forme de liste', () => {
    expect(buildRatingRows(['nature'], categories, [], []).every((row) => row.group === null)).toBe(true)
    expect(buildRatingRows(['nature', 'nature'], categories, [], [])).toHaveLength(3)
  })

  it('ne produit jamais de note globale', () => {
    const rows = buildRatingRows('nature', categories, [{ category_id: 'beaute', average: 4.5, votes: 2 }], [])
    expect(Object.keys(rows[0]).sort()).toEqual(['average', 'categoryId', 'group', 'label', 'mine', 'votes'])
  })
})

describe('formatAverage et formatVotes', () => {
  it('une décimale, virgule française', () => {
    expect(formatAverage(4.5)).toBe('4,5')
    expect(formatAverage(3)).toBe('3,0')
  })

  it('"avis" est invariable', () => {
    expect(formatVotes(1)).toBe('1 avis')
    expect(formatVotes(12)).toBe('12 avis')
  })
})

describe('ratingChanges', () => {
  it('rien à envoyer si rien n\'a changé', () => {
    expect(ratingChanges({ a: 4, b: null }, { a: 4, b: null })).toEqual({})
  })

  it('n\'envoie que les catégories modifiées', () => {
    expect(ratingChanges({ a: 4, b: 2, c: null }, { a: 4, b: 5, c: 3 })).toEqual({ b: 5, c: 3 })
  })

  it('envoie null pour une note retirée', () => {
    expect(ratingChanges({ a: 4 }, { a: null })).toEqual({ a: null })
  })

  it('traite une catégorie absente comme non notée', () => {
    expect(ratingChanges({}, { a: 3 })).toEqual({ a: 3 })
    expect(ratingChanges({ a: 3 }, {})).toEqual({ a: null })
    expect(ratingChanges({ a: null }, {})).toEqual({})
  })
})
