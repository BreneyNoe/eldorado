import { describe, expect, it } from 'vitest'
import { canDeleteUpdate, canEditUpdate, validateUpdateBody, wasEdited } from '@/features/updates/logic/updateRules'

const member = { userId: 'bob', isAdmin: false }
const admin = { userId: 'alice', isAdmin: true }
const dates = { created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' }

describe('validateUpdateBody', () => {
  it('accepte un texte de 1 à 1 000 caractères', () => {
    expect(validateUpdateBody('Le chemin est impraticable.')).toBeNull()
    expect(validateUpdateBody('a')).toBeNull()
    expect(validateUpdateBody('a'.repeat(1000))).toBeNull()
  })

  it('refuse un texte vide ou fait seulement d\'espaces', () => {
    expect(validateUpdateBody('')).not.toBeNull()
    expect(validateUpdateBody('   \n  ')).not.toBeNull()
  })

  it('refuse un texte trop long, espaces de bord exclus', () => {
    expect(validateUpdateBody('a'.repeat(1001))).toContain('1000')
    expect(validateUpdateBody(`  ${'a'.repeat(1000)}  `)).toBeNull()
  })
})

describe('canEditUpdate', () => {
  it('seul l\'auteur modifie son texte', () => {
    expect(canEditUpdate(member, { ...dates, author_id: 'bob' })).toBe(true)
    expect(canEditUpdate(member, { ...dates, author_id: 'carol' })).toBe(false)
  })

  it('un admin ne réécrit pas le texte d\'un autre', () => {
    expect(canEditUpdate(admin, { ...dates, author_id: 'bob' })).toBe(false)
    expect(canEditUpdate(admin, { ...dates, author_id: null })).toBe(false)
  })
})

describe('canDeleteUpdate', () => {
  it('chacun supprime ses propres updates', () => {
    expect(canDeleteUpdate(member, { ...dates, author_id: 'bob' })).toBe(true)
    expect(canDeleteUpdate(member, { ...dates, author_id: 'carol' })).toBe(false)
    expect(canDeleteUpdate(member, { ...dates, author_id: null })).toBe(false)
  })

  it('un admin supprime n\'importe quel update', () => {
    expect(canDeleteUpdate(admin, { ...dates, author_id: 'bob' })).toBe(true)
    expect(canDeleteUpdate(admin, { ...dates, author_id: null })).toBe(true)
  })
})

describe('wasEdited', () => {
  it('faux pour un update jamais modifié, ou modifié dans la minute', () => {
    expect(wasEdited({ ...dates, author_id: 'bob' })).toBe(false)
    expect(wasEdited({ author_id: 'bob', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:30Z' })).toBe(false)
  })

  it('vrai pour un update modifié plus tard', () => {
    expect(wasEdited({ author_id: 'bob', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:05:00Z' })).toBe(true)
  })

  it('faux si une date est illisible', () => {
    expect(wasEdited({ author_id: 'bob', created_at: 'x', updated_at: '2026-10-01T10:05:00Z' })).toBe(false)
  })
})
