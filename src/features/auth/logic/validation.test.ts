import { describe, expect, it } from 'vitest'
import {
  hasErrors,
  normalizeEmail,
  validateCredentials,
  validateDisplayName,
  validatePasswordChange,
  validateSignUp,
} from '@/features/auth/logic/validation'

describe('normalizeEmail', () => {
  it('retire les espaces et met en minuscules', () => {
    expect(normalizeEmail('  Bob@Example.COM ')).toBe('bob@example.com')
  })
})

describe('validateCredentials', () => {
  it('accepte un email et un mot de passe renseignés', () => {
    expect(hasErrors(validateCredentials('bob@example.com', 'secret'))).toBe(false)
  })

  it('signale les champs vides', () => {
    const errors = validateCredentials('   ', '')
    expect(errors.email).toBe('Saisis ton email.')
    expect(errors.password).toBe('Saisis ton mot de passe.')
  })

  it('signale un email mal formé', () => {
    for (const email of ['bob', 'bob@', 'bob@example', 'bob @example.com']) {
      expect(validateCredentials(email, 'secret').email).toBe("Cet email n'a pas un format valide.")
    }
  })

  it("n'impose aucune longueur au mot de passe à la connexion", () => {
    expect(validateCredentials('bob@example.com', 'a').password).toBeUndefined()
  })
})

describe('validateDisplayName', () => {
  it('applique les limites de la base : 2 à 40 caractères, espaces exclus', () => {
    expect(validateDisplayName('Bo')).toBeNull()
    expect(validateDisplayName('a'.repeat(40))).toBeNull()
    expect(validateDisplayName(' B ')).not.toBeNull()
    expect(validateDisplayName('a'.repeat(41))).not.toBeNull()
  })
})

describe('validatePasswordChange', () => {
  it('accepte un changement correct', () => {
    expect(hasErrors(validatePasswordChange('ancien-mdp', 'nouveau-mdp', 'nouveau-mdp'))).toBe(false)
  })

  it('exige le mot de passe actuel', () => {
    expect(validatePasswordChange('', 'nouveau-mdp', 'nouveau-mdp').current).toBeDefined()
  })

  it('exige au moins 8 caractères', () => {
    expect(validatePasswordChange('ancien-mdp', 'court', 'court').next).toContain('8')
  })

  it("refuse un nouveau mot de passe identique à l'ancien", () => {
    expect(validatePasswordChange('meme-mot-de-passe', 'meme-mot-de-passe', 'meme-mot-de-passe').next).toBeDefined()
  })

  it('exige deux saisies identiques', () => {
    expect(validatePasswordChange('ancien-mdp', 'nouveau-mdp', 'nouveau-mdq').confirmation).toBeDefined()
  })
})

describe('validateSignUp', () => {
  const valid = { displayName: 'Camille', email: 'camille@example.com', password: 'motdepasse', confirmation: 'motdepasse' }

  it('accepte une inscription complète', () => {
    expect(validateSignUp(valid)).toEqual({})
  })

  it('exige un nom de 2 à 40 caractères', () => {
    expect(validateSignUp({ ...valid, displayName: ' a ' }).displayName).toContain('au moins 2')
    expect(validateSignUp({ ...valid, displayName: 'a'.repeat(41) }).displayName).toContain('40')
  })

  it('exige un email au bon format', () => {
    expect(validateSignUp({ ...valid, email: '' }).email).toBe('Saisis ton email.')
    expect(validateSignUp({ ...valid, email: 'camille@' }).email).toContain('format')
  })

  it('exige un mot de passe de 8 caractères au moins', () => {
    expect(validateSignUp({ ...valid, password: 'court', confirmation: 'court' }).password).toContain('au moins 8')
  })

  it('exige deux saisies identiques du mot de passe', () => {
    expect(validateSignUp({ ...valid, confirmation: 'motdepass3' }).confirmation).toBe('Les deux mots de passe sont différents.')
  })
})
