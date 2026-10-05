import { describe, expect, it } from 'vitest'
import { AVATAR_COLORS, avatarColor, avatarInitial } from '@/lib/avatar'

describe('avatarColor', () => {
  it('donne toujours la même couleur au même nom', () => {
    expect(avatarColor('Camille')).toBe(avatarColor('Camille'))
    expect(avatarColor('  camille ')).toBe(avatarColor('CAMILLE'))
  })

  it('reste dans la palette, même pour un nom vide ou absent', () => {
    for (const name of ['Camille', 'bob', 'Élodie', '', null, undefined, '🙂']) {
      expect(AVATAR_COLORS).toContain(avatarColor(name))
    }
  })

  it('répartit des noms différents sur plusieurs couleurs', () => {
    const colors = new Set(['Alice', 'Bob', 'Carol', 'Dana', 'Eli', 'Fred', 'Gina', 'Hugo', 'Inès', 'Jules'].map(avatarColor))
    expect(colors.size).toBeGreaterThan(3)
  })
})

describe('avatarInitial', () => {
  it('prend la première lettre, en majuscule', () => {
    expect(avatarInitial('camille')).toBe('C')
    expect(avatarInitial('  élodie')).toBe('É')
  })

  it('ne coupe pas un émoji en deux', () => {
    expect(avatarInitial('🙂 Léo')).toBe('🙂')
  })

  it('donne "?" quand il n\'y a pas de nom', () => {
    expect(avatarInitial('')).toBe('?')
    expect(avatarInitial(null)).toBe('?')
  })
})
