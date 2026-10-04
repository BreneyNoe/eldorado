import { describe, expect, it } from 'vitest'
import { formatDay, formatInstantDateTime, formatInstantDay } from '@/lib/formatDate'

describe('formatDay', () => {
  it('écrit la date en toutes lettres', () => {
    expect(formatDay('2026-09-10')).toBe('10 septembre 2026')
    expect(formatDay('2026-01-01')).toBe('1 janvier 2026')
  })

  it('ne décale pas le jour, quel que soit le fuseau', () => {
    // Lue comme un instant UTC, cette date deviendrait le 31 décembre à l'ouest de Greenwich.
    expect(formatDay('2026-01-01')).toContain('1 janvier')
  })

  it('renvoie null pour une valeur absente ou invalide', () => {
    expect(formatDay(null)).toBeNull()
    expect(formatDay('')).toBeNull()
    expect(formatDay('pas une date')).toBeNull()
  })
})

describe('formatInstantDay', () => {
  it('donne le jour d\'un instant', () => {
    expect(formatInstantDay('2026-10-04T12:00:00Z')).toBe('4 octobre 2026')
  })

  it('renvoie null pour une valeur absente ou invalide', () => {
    expect(formatInstantDay(undefined)).toBeNull()
    expect(formatInstantDay('n\'importe quoi')).toBeNull()
  })
})

describe('formatInstantDateTime', () => {
  it('donne le jour et l\'heure', () => {
    // Construit en heure locale : le test ne dépend pas du fuseau de la machine.
    const instant = new Date(2026, 8, 10, 14, 5).toISOString()
    expect(formatInstantDateTime(instant)).toBe('10 septembre 2026 à 14:05')
  })

  it('renvoie null pour une valeur absente ou invalide', () => {
    expect(formatInstantDateTime(null)).toBeNull()
    expect(formatInstantDateTime('hier')).toBeNull()
  })
})
