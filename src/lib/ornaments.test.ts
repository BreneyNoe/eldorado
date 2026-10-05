import { describe, expect, it } from 'vitest'
import { AVATAR_RANKS } from '@/lib/avatar'
import { ORNAMENTS, ornamentLayout, ornamentSize } from '@/lib/ornaments'

describe('ornements', () => {
  it('un ornement par rang, chacun plus large que l\'avatar', () => {
    expect(Object.keys(ORNAMENTS).sort()).toEqual(AVATAR_RANKS.map((rank) => rank.id).sort())
    for (const rank of AVATAR_RANKS) {
      expect(ORNAMENTS[rank.id].src, rank.id).toBeTruthy()
      expect(ORNAMENTS[rank.id].scale, rank.id).toBeGreaterThan(1.2)
    }
  })

  it('plus le rang est élevé, plus l\'ornement déborde', () => {
    const scales = AVATAR_RANKS.map((rank) => ORNAMENTS[rank.id].scale)
    expect([...scales].sort((a, b) => a - b)).toEqual(scales)
  })
})

describe('ornamentLayout', () => {
  it('ornement de taille raisonnable : l\'avatar garde son diamètre', () => {
    for (const rank of ['bronze', 'silver', 'gold', 'platinum'] as const) {
      const layout = ornamentLayout(rank, 40)
      expect(layout.face, rank).toBeCloseTo(40, 5)
      expect(layout.box, rank).toBeCloseTo(ornamentSize(rank, 40), 5)
    }
  })

  it('ornement très large : l\'ensemble est réduit, sans dépasser 2,4 fois l\'avatar nu', () => {
    const layout = ornamentLayout('dark', 40)
    expect(layout.box).toBeCloseTo(96, 5)
    expect(layout.face).toBeLessThan(40)
    // L'avatar et l'ornement gardent leurs proportions : le trou reste rempli.
    expect(ornamentSize('dark', layout.face)).toBeCloseTo(layout.box, 5)
  })

  it('ne dépasse jamais 320 px de large, pour tenir sur un téléphone', () => {
    for (const rank of AVATAR_RANKS) {
      for (const face of [28, 40, 96, 144]) {
        const layout = ornamentLayout(rank.id, face)
        expect(layout.box, `${rank.id} ${face}`).toBeLessThanOrEqual(320)
        expect(layout.face, `${rank.id} ${face}`).toBeLessThanOrEqual(face)
      }
    }
  })
})
