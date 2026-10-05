import { describe, expect, it } from 'vitest'
import { deriveAuthState } from '@/features/auth/logic/authState'
import { AppError } from '@/lib/errors'
import type { Profile } from '@/types/models'

const session = { userId: 'user-1', email: 'bob@example.com' }
const profile: Profile = {
  id: 'user-1',
  display_name: 'Bob',
  role: 'user',
  is_active: true,
  avatar_path: null,
  avatar_icon: null,
  avatar_color: null,
  spot_count: 0,
  rank_seen: 0,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
}
const base = { sessionKnown: true, session, profile, profileError: null }

describe('deriveAuthState', () => {
  it('attend tant que la session enregistrée n\'a pas été lue', () => {
    expect(deriveAuthState({ ...base, sessionKnown: false }).status).toBe('loading')
  })

  it('personne de connecté', () => {
    expect(deriveAuthState({ ...base, session: null, profile: undefined })).toEqual({
      status: 'signed_out',
      byUser: false,
    })
  })

  it('retient une déconnexion volontaire', () => {
    expect(
      deriveAuthState({ ...base, session: null, profile: undefined, signedOutByUser: true }),
    ).toEqual({ status: 'signed_out', byUser: true })
  })

  it('connecté, profil en cours de lecture', () => {
    expect(deriveAuthState({ ...base, profile: undefined }).status).toBe('loading')
  })

  it('connecté, profil illisible : erreur avec possibilité de réessayer', () => {
    const error = new AppError('network', 'Connexion impossible.')
    const state = deriveAuthState({ ...base, profile: undefined, profileError: error })
    expect(state.status).toBe('profile_error')
    if (state.status === 'profile_error') expect(state.error).toBe(error)
  })

  it('connecté, aucun profil en base : bloqué', () => {
    const state = deriveAuthState({ ...base, profile: null })
    expect(state).toMatchObject({ status: 'blocked', reason: 'no_profile' })
  })

  it('compte désactivé : bloqué', () => {
    const state = deriveAuthState({ ...base, profile: { ...profile, is_active: false } })
    expect(state).toMatchObject({ status: 'blocked', reason: 'disabled' })
  })

  it('membre actif : prêt, sans droits admin', () => {
    const state = deriveAuthState(base)
    expect(state).toMatchObject({ status: 'ready', isAdmin: false })
  })

  it('administrateur actif : prêt, avec droits admin', () => {
    const state = deriveAuthState({ ...base, profile: { ...profile, role: 'admin' } })
    expect(state).toMatchObject({ status: 'ready', isAdmin: true })
  })

  it('un admin désactivé reste bloqué', () => {
    const state = deriveAuthState({ ...base, profile: { ...profile, role: 'admin', is_active: false } })
    expect(state.status).toBe('blocked')
  })

  it('un profil déjà connu reste utilisable si son rafraîchissement échoue', () => {
    const state = deriveAuthState({ ...base, profileError: new AppError('network', 'Connexion impossible.') })
    expect(state.status).toBe('ready')
  })
})
