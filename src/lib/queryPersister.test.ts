import { describe, expect, it } from 'vitest'
import { shouldPersistKey } from '@/lib/queryPersister'

describe('shouldPersistKey', () => {
  it('garde ce qui se consulte hors ligne', () => {
    expect(shouldPersistKey(['profile', 'user-1'])).toBe(true)
    expect(shouldPersistKey(['spot-types'])).toBe(true)
    expect(shouldPersistKey(['spot-subtypes'])).toBe(true)
    expect(shouldPersistKey(['rating-categories'])).toBe(true)
    expect(shouldPersistKey(['spots', 'light'])).toBe(true)
    expect(shouldPersistKey(['spots', 'detail', 'spot-1'])).toBe(true)
    expect(shouldPersistKey(['spots', 'photos', 'spot-1'])).toBe(true)
    expect(shouldPersistKey(['spots', 'ratings', 'spot-1', 'summary'])).toBe(true)
    expect(shouldPersistKey(['spots', 'updates', 'spot-1'])).toBe(true)
  })

  it('n\'enregistre pas l\'administration', () => {
    expect(shouldPersistKey(['admin', 'users'])).toBe(false)
    expect(shouldPersistKey(['admin', 'storage'])).toBe(false)
  })

  it('n\'enregistre pas ce qui ne sert qu\'à une création en cours', () => {
    expect(shouldPersistKey(['geocode', 'reverse', 44.8, 4.25])).toBe(false)
    expect(shouldPersistKey(['spots', 'nearby', 44.8, 4.25, null])).toBe(false)
  })
})
