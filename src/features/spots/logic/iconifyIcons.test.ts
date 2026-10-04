// @vitest-environment jsdom
import { iconLoaded } from '@iconify/react'
import { describe, expect, it } from 'vitest'
import { EMBEDDED_ICONIFY_ICONS, isIconifyName } from '@/features/spots/logic/iconifyIcons'

describe('isIconifyName', () => {
  it('reconnaît la forme "collection:nom"', () => {
    expect(isIconifyName('pinhead:lowered-curb')).toBe(true)
    expect(isIconifyName('game-icons:fishing')).toBe(true)
    expect(isIconifyName('spots:ride')).toBe(true)
  })

  it('refuse un nom du jeu de base, un texte libre ou une valeur absente', () => {
    expect(isIconifyName('trees')).toBe(false)
    expect(isIconifyName('pas une icone')).toBe(false)
    expect(isIconifyName('Collection:Nom')).toBe(false)
    expect(isIconifyName(null)).toBe(false)
    expect(isIconifyName(undefined)).toBe(false)
  })
})

describe('icônes embarquées', () => {
  it('contient les icônes des types, des sous-catégories et du bouton "Y aller"', () => {
    expect(Object.keys(EMBEDDED_ICONIFY_ICONS).sort()).toEqual([
      'boxicons:swimming',
      'fluent-emoji-high-contrast:zany-face',
      'game-icons:castle-ruins',
      'game-icons:fishing',
      'gcp:google-maps-platform',
      'lucide-lab:stairs-arrow-down-left',
      'material-symbols-light:escalator-outline',
      'pinhead:flush-curb',
      'pinhead:lowered-curb',
      'spots:ride',
    ])
  })

  it('chaque icône a un nom valide, des dimensions et un dessin', () => {
    for (const [name, icon] of Object.entries(EMBEDDED_ICONIFY_ICONS)) {
      expect(isIconifyName(name), name).toBe(true)
      expect(icon.width, name).toBeGreaterThan(0)
      expect(icon.height, name).toBeGreaterThan(0)
      expect(icon.body.length, name).toBeGreaterThan(20)
    }
  })

  it('est déclarée auprès d\'Iconify : aucune ne sera demandée au réseau', () => {
    for (const name of Object.keys(EMBEDDED_ICONIFY_ICONS)) {
      expect(iconLoaded(name), name).toBe(true)
    }
  })

  it('les icônes d\'un seul ton suivent la couleur du texte', () => {
    // Indispensable pour le marqueur de la carte, où l'icône est dessinée en blanc.
    for (const name of ['spots:ride', 'game-icons:fishing', 'game-icons:castle-ruins', 'boxicons:swimming']) {
      expect(EMBEDDED_ICONIFY_ICONS[name].body, name).toContain('currentColor')
    }
  })
})
