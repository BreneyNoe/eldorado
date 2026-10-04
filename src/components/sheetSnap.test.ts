import { describe, expect, it } from 'vitest'
import { resolveSnap, snapHeights, toggleSnap } from '@/components/sheetSnap'

const heights = snapHeights(600, 84)

describe('snapHeights', () => {
  it('calcule replié, mi-hauteur et plein', () => {
    expect(heights).toEqual({ peek: 84, half: 300, full: 600 })
  })

  it('reste cohérent sur un écran très petit', () => {
    expect(snapHeights(100, 84)).toEqual({ peek: 84, half: 84, full: 100 })
    expect(snapHeights(50, 84)).toEqual({ peek: 84, half: 84, full: 84 })
  })
})

describe('resolveSnap', () => {
  it('geste lent : position la plus proche', () => {
    expect(resolveSnap(120, 0, heights)).toBe('peek')
    expect(resolveSnap(250, 0.1, heights)).toBe('half')
    expect(resolveSnap(500, -0.1, heights)).toBe('full')
  })

  it('coup de doigt vers le haut : position suivante', () => {
    expect(resolveSnap(100, 1, heights)).toBe('half')
    expect(resolveSnap(320, 1, heights)).toBe('full')
    expect(resolveSnap(600, 1, heights)).toBe('full')
  })

  it('coup de doigt vers le bas : position précédente', () => {
    expect(resolveSnap(580, -1, heights)).toBe('half')
    expect(resolveSnap(280, -1, heights)).toBe('peek')
    expect(resolveSnap(84, -1, heights)).toBe('peek')
  })
})

describe('toggleSnap', () => {
  it('alterne entre replié et mi-hauteur', () => {
    expect(toggleSnap('peek')).toBe('half')
    expect(toggleSnap('half')).toBe('peek')
    expect(toggleSnap('full')).toBe('peek')
  })
})
