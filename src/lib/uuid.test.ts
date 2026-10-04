import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUuid } from '@/lib/uuid'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.unstubAllGlobals())

describe('createUuid', () => {
  it('produit un UUID version 4', () => {
    expect(createUuid()).toMatch(UUID_V4)
  })

  it('produit des valeurs différentes à chaque appel', () => {
    expect(new Set(Array.from({ length: 50 }, createUuid)).size).toBe(50)
  })

  it('fonctionne aussi sans crypto.randomUUID (adresse non sécurisée)', () => {
    const realCrypto = globalThis.crypto
    // Remplaçant volontairement dépourvu de randomUUID.
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array<ArrayBuffer>) => realCrypto.getRandomValues(array),
    })
    expect('randomUUID' in globalThis.crypto).toBe(false)
    expect(createUuid()).toMatch(UUID_V4)
  })
})
