import { describe, expect, it } from 'vitest'
import { AppError, toAppError, unwrap } from '@/lib/errors'

describe('toAppError', () => {
  it('laisse passer une AppError sans la modifier', () => {
    const original = new AppError('conflict', 'Déjà là')
    expect(toAppError(original)).toBe(original)
  })

  it('reconnaît une panne de réseau, quel que soit le navigateur', () => {
    for (const message of ['TypeError: Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
      const error = toAppError({ message })
      expect(error.kind).toBe('network')
      expect(error.retryable).toBe(true)
    }
  })

  it('traduit les erreurs métier de la base', () => {
    const error = toAppError({ code: 'P0001', message: 'APP_LAST_ADMIN' })
    expect(error.kind).toBe('validation')
    expect(error.code).toBe('APP_LAST_ADMIN')
    expect(error.message).toBe('Il doit rester au moins un administrateur actif.')
    expect(error.retryable).toBe(false)
  })

  it('traduit une contrainte connue en message précis', () => {
    const error = toAppError({
      code: '23514',
      message: 'new row for relation "spots" violates check constraint "spots_name_length"',
    })
    expect(error.kind).toBe('validation')
    expect(error.message).toBe('Le nom du spot doit contenir entre 2 et 80 caractères.')
  })

  it('donne un message générique pour une contrainte inconnue', () => {
    const error = toAppError({ code: '23514', message: 'violates check constraint "autre_chose"' })
    expect(error.kind).toBe('validation')
    expect(error.message).toBe('Certaines informations ne sont pas valides.')
  })

  it('reconnaît un refus de la base', () => {
    expect(toAppError({ code: '42501', message: 'permission denied for table spots' }).kind).toBe('permission')
    expect(
      toAppError({ message: 'new row violates row-level security policy for table "spots"' }).kind,
    ).toBe('permission')
  })

  it('reconnaît de mauvais identifiants', () => {
    const error = toAppError({ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 })
    expect(error.kind).toBe('auth')
    expect(error.message).toBe('Email ou mot de passe incorrect.')
  })

  it("traduit les erreurs courantes de l'authentification", () => {
    expect(toAppError({ name: 'AuthRetryableFetchError', message: '{}', status: 0 }).kind).toBe('network')
    expect(toAppError({ code: 'user_banned', message: 'User is banned', status: 400 }).kind).toBe('permission')
    expect(toAppError({ code: 'weak_password', message: 'Password should be at least 6 characters', status: 422 }).message).toBe(
      'Ce mot de passe est trop faible. Choisis-en un plus long.',
    )
    expect(toAppError({ code: 'same_password', message: 'New password should be different', status: 422 }).kind).toBe('validation')
    expect(toAppError({ code: 'over_request_rate_limit', message: 'Too many requests', status: 429 }).kind).toBe('rate_limit')
    expect(toAppError({ code: 'session_not_found', message: 'Session from session_id claim in JWT does not exist', status: 403 }).kind).toBe('auth')
    expect(toAppError({ name: 'AuthSessionMissingError', message: 'Auth session missing!', status: 400 }).kind).toBe('auth')
  })

  it('reconnaît un élément encore utilisé, un doublon et un élément introuvable', () => {
    expect(toAppError({ code: '23503', message: 'violates foreign key constraint' }).kind).toBe('validation')
    expect(toAppError({ code: '23505', message: 'duplicate key value' }).kind).toBe('conflict')
    expect(toAppError({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }).kind).toBe('not_found')
  })

  it('reconnaît un fichier trop lourd', () => {
    const error = toAppError({ statusCode: '413', message: 'The object exceeded the maximum allowed size' })
    expect(error.kind).toBe('validation')
    expect(error.message).toBe('Ce fichier est trop lourd.')
  })

  it('ne lève jamais, même sur une valeur inattendue', () => {
    for (const value of [null, undefined, 42, 'texte', {}, new Error('boom')]) {
      const error = toAppError(value)
      expect(error).toBeInstanceOf(AppError)
      expect(error.kind).toBe('unknown')
    }
  })

  it("conserve l'erreur d'origine", () => {
    const original = { code: '42501', message: 'permission denied' }
    expect(toAppError(original).cause).toBe(original)
  })
})

describe('unwrap', () => {
  it('renvoie la donnée quand tout va bien', () => {
    expect(unwrap({ data: [1, 2], error: null })).toEqual([1, 2])
  })

  it('lève une AppError quand Supabase renvoie une erreur', () => {
    expect(() => unwrap({ data: null, error: { code: '42501', message: 'permission denied' } })).toThrow(AppError)
  })

  it('lève "introuvable" quand il n\'y a ni donnée ni erreur', () => {
    try {
      unwrap({ data: null, error: null })
      expect.unreachable()
    } catch (error) {
      expect(toAppError(error).kind).toBe('not_found')
    }
  })

  it('traduit les erreurs propres à l\'inscription', () => {
    const taken = toAppError({ name: 'AuthApiError', code: 'user_already_exists', status: 422, message: 'User already registered' })
    expect(taken.kind).toBe('conflict')
    expect(taken.message).toContain('existe déjà avec cet email')

    const closed = toAppError({ name: 'AuthApiError', code: 'signup_disabled', status: 422, message: 'Signups not allowed for this instance' })
    expect(closed.kind).toBe('permission')
    expect(closed.message).toContain('inscriptions sont fermées')
  })
})
