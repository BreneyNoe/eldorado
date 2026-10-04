import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  isHexColor,
  nextSortOrder,
  quotaPercent,
  slugifyKey,
  uniqueKey,
  validateLabel,
  validatePhotoLimit,
  validateRadius,
} from '@/features/admin/logic/adminRules'

describe('slugifyKey', () => {
  it('retire accents, majuscules et ponctuation', () => {
    expect(slugifyKey('Plans inclinés')).toBe('plans_inclines')
    expect(slugifyKey('Ledges et curbs')).toBe('ledges_et_curbs')
    expect(slugifyKey('  Qualité du spot !  ')).toBe('qualite_du_spot')
  })

  it('commence toujours par une lettre', () => {
    expect(slugifyKey('3 marches')).toBe('marches')
    expect(slugifyKey('_x_y')).toBe('x_y')
  })

  it('respecte la longueur acceptée par la base', () => {
    const key = slugifyKey('a'.repeat(60))
    expect(key).toHaveLength(31)
    expect(/^[a-z][a-z0-9_]{1,30}$/.test(key)).toBe(true)
  })

  it('renvoie une chaîne vide quand rien d\'exploitable ne reste', () => {
    expect(slugifyKey('!!!')).toBe('')
    expect(slugifyKey('é')).toBe('')
    expect(slugifyKey('42')).toBe('')
  })
})

describe('uniqueKey', () => {
  it('garde la clé si elle est libre, sinon la numérote', () => {
    expect(uniqueKey('rails', ['gaps'])).toBe('rails')
    expect(uniqueKey('rails', ['rails'])).toBe('rails_2')
    expect(uniqueKey('rails', ['rails', 'rails_2'])).toBe('rails_3')
  })
})

describe('nextSortOrder', () => {
  it('place un nouvel élément après les autres', () => {
    expect(nextSortOrder([])).toBe(10)
    expect(nextSortOrder([{ sort_order: 10 }, { sort_order: 50 }, { sort_order: 30 }])).toBe(60)
  })
})

describe('formatBytes', () => {
  it('choisit l\'unité et la virgule française', () => {
    expect(formatBytes(512)).toBe('512 o')
    expect(formatBytes(348_160)).toBe('340 Ko')
    expect(formatBytes(13_002_342)).toBe('12,4 Mo')
    expect(formatBytes(1_095_216_660)).toBe('1,02 Go')
  })

  it('reste lisible sur une valeur absurde', () => {
    expect(formatBytes(-5)).toBe('0 o')
    expect(formatBytes(Number.NaN)).toBe('0 o')
  })
})

describe('quotaPercent', () => {
  it('donne la part du gigaoctet gratuit', () => {
    expect(quotaPercent(0)).toBe(0)
    expect(quotaPercent(268_435_456)).toBe(25)
    expect(quotaPercent(5_000_000_000)).toBe(100)
  })
})

describe('validations', () => {
  it('couleur au format #RRGGBB', () => {
    expect(isHexColor('#2F9E44')).toBe(true)
    expect(isHexColor('2F9E44')).toBe(false)
    expect(isHexColor('#2F9')).toBe(false)
  })

  it('libellé de 1 à 40 caractères', () => {
    expect(validateLabel('Rails')).toBeNull()
    expect(validateLabel('   ')).not.toBeNull()
    expect(validateLabel('a'.repeat(41))).not.toBeNull()
  })

  it('limite de photos entière entre 1 et 50', () => {
    expect(validatePhotoLimit('10')).toBeNull()
    expect(validatePhotoLimit('1')).toBeNull()
    expect(validatePhotoLimit('0')).not.toBeNull()
    expect(validatePhotoLimit('51')).not.toBeNull()
    expect(validatePhotoLimit('dix')).not.toBeNull()
  })

  it('rayon entier entre 1 et 5 000 m', () => {
    expect(validateRadius('100')).toBeNull()
    expect(validateRadius(' 5000 ')).toBeNull()
    expect(validateRadius('0')).not.toBeNull()
    expect(validateRadius('5001')).not.toBeNull()
    expect(validateRadius('12,5')).not.toBeNull()
    expect(validateRadius('')).not.toBeNull()
  })
})
