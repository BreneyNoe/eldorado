import { describe, expect, it } from 'vitest'
import { canDeletePhoto, canDeleteSpot, canEditSpot } from '@/features/spots/logic/permissions'

const member = { userId: 'bob', isAdmin: false }
const admin = { userId: 'alice', isAdmin: true }

describe('canEditSpot', () => {
  it('le créateur peut modifier son spot', () => {
    expect(canEditSpot(member, { created_by: 'bob' })).toBe(true)
  })

  it('un autre membre ne peut pas', () => {
    expect(canEditSpot(member, { created_by: 'carol' })).toBe(false)
  })

  it('un admin peut modifier tous les spots, même sans créateur', () => {
    expect(canEditSpot(admin, { created_by: 'carol' })).toBe(true)
    expect(canEditSpot(admin, { created_by: null })).toBe(true)
  })

  it('un spot dont le créateur a été supprimé n\'appartient à aucun membre', () => {
    expect(canEditSpot(member, { created_by: null })).toBe(false)
  })
})

describe('canDeleteSpot', () => {
  it('réservé aux admins, même pour le créateur', () => {
    expect(canDeleteSpot(member)).toBe(false)
    expect(canDeleteSpot(admin)).toBe(true)
  })
})

describe('canDeletePhoto', () => {
  it('chacun supprime ses propres photos', () => {
    expect(canDeletePhoto(member, { uploaded_by: 'bob' })).toBe(true)
    expect(canDeletePhoto(member, { uploaded_by: 'carol' })).toBe(false)
    expect(canDeletePhoto(member, { uploaded_by: null })).toBe(false)
  })

  it('un admin supprime n\'importe quelle photo', () => {
    expect(canDeletePhoto(admin, { uploaded_by: 'carol' })).toBe(true)
    expect(canDeletePhoto(admin, { uploaded_by: null })).toBe(true)
  })
})
