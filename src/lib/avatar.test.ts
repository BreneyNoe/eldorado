import { describe, expect, it } from 'vitest'
import {
  AVATAR_COLOR_CHOICES,
  AVATAR_COLORS,
  AVATAR_RANKS,
  avatarBackground,
  avatarColor,
  avatarInitial,
  avatarRank,
  nextAvatarRank,
  readableOn,
} from '@/lib/avatar'

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

describe('avatarBackground', () => {
  it('prend la couleur choisie par la personne', () => {
    expect(avatarBackground({ display_name: 'Camille', avatar_color: '#0C8599' })).toBe('#0C8599')
  })

  it('sinon, celle tirée de son nom', () => {
    expect(avatarBackground({ display_name: 'Camille', avatar_color: null })).toBe(avatarColor('Camille'))
    expect(avatarBackground(null)).toBe(avatarColor(''))
  })

  it('ignore une valeur qui n\'est pas une couleur', () => {
    expect(avatarBackground({ display_name: 'Camille', avatar_color: 'url(javascript:1)' })).toBe(avatarColor('Camille'))
  })
})

describe('readableOn', () => {
  it('dessin sombre sur fond clair, blanc sur fond foncé', () => {
    expect(readableOn('#FFE000')).toBe('#16233b')
    expect(readableOn('#ffffff')).toBe('#16233b')
    expect(readableOn('#067302')).toBe('#ffffff')
    expect(readableOn('#16233B')).toBe('#ffffff')
  })

  it('reste lisible sur chacune des couleurs proposées', () => {
    for (const color of AVATAR_COLOR_CHOICES) expect(['#ffffff', '#16233b']).toContain(readableOn(color))
  })
})

describe('rangs', () => {
  it('seuils : 5, 15, 30, 50 et 80 spots publiés', () => {
    expect(AVATAR_RANKS.map((rank) => [rank.id, rank.threshold])).toEqual([
      ['bronze', 5],
      ['silver', 15],
      ['gold', 30],
      ['platinum', 50],
      ['dark', 80],
    ])
  })

  it('aucun ornement avant le cinquième spot', () => {
    expect(avatarRank(0)).toBeNull()
    expect(avatarRank(4)).toBeNull()
    expect(avatarRank(null)).toBeNull()
    expect(avatarRank(undefined)).toBeNull()
  })

  it('chaque seuil donne son rang, et le garde jusqu\'au suivant', () => {
    expect(avatarRank(5)?.title).toBe('Cheap researcher')
    expect(avatarRank(14)?.id).toBe('bronze')
    expect(avatarRank(15)?.title).toBe('Explorer')
    expect(avatarRank(29)?.id).toBe('silver')
    expect(avatarRank(30)?.title).toBe('Spot Finder')
    expect(avatarRank(49)?.id).toBe('gold')
    expect(avatarRank(50)?.title).toBe('Land Guardians')
    expect(avatarRank(79)?.id).toBe('platinum')
    expect(avatarRank(80)?.title).toBe('Cavalier of Eldorado')
    expect(avatarRank(4000)?.id).toBe('dark')
  })

  it('indique le prochain rang, puis plus rien une fois le dernier atteint', () => {
    expect(nextAvatarRank(0)?.threshold).toBe(5)
    expect(nextAvatarRank(5)?.threshold).toBe(15)
    expect(nextAvatarRank(49)?.threshold).toBe(50)
    expect(nextAvatarRank(50)?.threshold).toBe(80)
    expect(nextAvatarRank(80)).toBeNull()
  })
})
